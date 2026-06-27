<?php

namespace App\Services;

use App\Models\LeadSource;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\ProjectStatus;
use Modules\Tenancy\Models\Workspace;
use Modules\Tenancy\Services\SettingsService;
use Illuminate\Support\Facades\DB;

/**
 * LookupService — manages workspace-scoped reference data (pipelines, stages,
 * lead sources, project statuses) and their defaults in workspace_settings.
 *
 * Precondition for seedDefaults(): caller must have already set the workspace
 * context (app.current_workspace RLS + app('currentWorkspace') binding) so
 * BelongsToWorkspace can stamp workspace_id and RLS WITH CHECK passes.
 *
 * Reusable from HTTP, console, queue, or provisioning — no request coupling.
 */
class LookupService
{
    public function __construct(private readonly SettingsService $settings) {}

    /**
     * Seed a fresh workspace with default pipelines, stages, lead sources and
     * project statuses. Called by WorkspaceProvisioningService (production) and
     * FoundationSeeder (dev). Idempotent: safe to call multiple times.
     *
     * @param  Workspace  $workspace  Must match currentWorkspace() (caller responsibility).
     */
    public function seedDefaults(Workspace $workspace): void
    {
        DB::transaction(function (): void {
            // Pipeline + stages — only if this workspace has none yet (granular
            // idempotency: backfills whatever is missing without duplicating).
            if (! Pipeline::exists()) {
                $pipeline = $this->createPipeline('Sales Pipeline', isDefault: true);
                $this->createStage($pipeline, ['name' => 'New', 'type' => 'open', 'stage_order' => 0, 'probability' => 10, 'color' => '#3b82f6']);
                $this->createStage($pipeline, ['name' => 'Won', 'type' => 'won', 'stage_order' => 1, 'probability' => 100, 'color' => '#22c55e']);
                $this->createStage($pipeline, ['name' => 'Lost', 'type' => 'lost', 'stage_order' => 2, 'probability' => 0, 'color' => '#ef4444']);
            }

            // Lead sources — only if none yet.
            if (! LeadSource::exists()) {
                $firstSource = null;
                foreach (['Website', 'Referral', 'Direct', 'Social Media', 'Email'] as $sourceName) {
                    $source = $this->createSource($sourceName);
                    $firstSource ??= $source;
                }
                if ($firstSource) {
                    $this->settings->set('default_lead_source_id', $firstSource->id);
                }
            }

            // Project statuses — only if none yet.
            if (! ProjectStatus::exists()) {
                $statusDefs = [
                    ['name' => 'Not Started', 'status_order' => 0, 'color' => '#94a3b8'],
                    ['name' => 'In Progress', 'status_order' => 1, 'color' => '#3b82f6'],
                    ['name' => 'On Hold', 'status_order' => 2, 'color' => '#f59e0b'],
                    ['name' => 'Completed', 'status_order' => 3, 'color' => '#22c55e'],
                    ['name' => 'Cancelled', 'status_order' => 4, 'color' => '#ef4444'],
                ];
                $firstStatus = null;
                foreach ($statusDefs as $attrs) {
                    $status = $this->createProjectStatus($attrs);
                    $firstStatus ??= $status;
                }
                if ($firstStatus) {
                    $this->settings->set('default_project_status_id', $firstStatus->id);
                }
            }
        });
    }

    /**
     * Create a pipeline. If is_default=true, clears the existing default first
     * (single-default invariant) and updates workspace_settings.
     */
    public function createPipeline(string $name, bool $isDefault = false): Pipeline
    {
        return DB::transaction(function () use ($name, $isDefault): Pipeline {
            if ($isDefault) {
                Pipeline::where('is_default', true)->update(['is_default' => false]);
            }

            $pipeline = new Pipeline;
            $pipeline->name = $name;
            $pipeline->is_default = $isDefault;
            $pipeline->save();

            if ($isDefault) {
                $this->settings->set('default_pipeline_id', $pipeline->id);
            }

            return $pipeline;
        });
    }

    /**
     * Create a stage within a pipeline. workspace_id auto-stamped from context.
     *
     * @param  array<string, mixed>  $attrs
     */
    public function createStage(Pipeline $pipeline, array $attrs): PipelineStage
    {
        $stage = new PipelineStage;
        $stage->pipeline_id = $pipeline->id;
        $stage->name = $attrs['name'];
        $stage->type = $attrs['type'] ?? 'open';
        $stage->stage_order = $attrs['stage_order'] ?? 0;
        $stage->probability = $attrs['probability'] ?? 0;
        $stage->color = $attrs['color'] ?? null;
        $stage->save();

        return $stage;
    }

    /**
     * Reorder stages by re-assigning stage_order according to the given id list.
     *
     * @param  list<string>  $orderedStageIds
     */
    public function reorderStages(Pipeline $pipeline, array $orderedStageIds): void
    {
        DB::transaction(function () use ($pipeline, $orderedStageIds): void {
            foreach ($orderedStageIds as $order => $stageId) {
                PipelineStage::where('id', $stageId)
                    ->where('pipeline_id', $pipeline->id)
                    ->update(['stage_order' => $order]);
            }
        });
    }

    /**
     * Soft-delete a stage.
     *
     * Reference guard: when Lead model exists (Phase 07) this will abort(422) if
     * any lead references this stage. Hook wired in Phase 07.
     * // reference guard wired in Phase 07
     */
    public function deleteStage(PipelineStage $stage): void
    {
        // reference guard wired in Phase 07: Lead::where('stage_id',$stage->id)->exists() → abort(422)
        $stage->delete();
    }

    /**
     * Create a lead source.
     */
    public function createSource(string $name): LeadSource
    {
        $source = new LeadSource;
        $source->name = $name;
        $source->save();

        return $source;
    }

    /**
     * Delete a lead source. Clears the default setting if this was the default.
     *
     * Reference guard wired in Phase 07 (Lead model).
     */
    public function deleteSource(LeadSource $source): void
    {
        // reference guard wired in Phase 07: Lead::where('source_id',$source->id)->exists() → abort(422)
        $defaultId = $this->settings->get('default_lead_source_id');
        if ($defaultId === $source->id) {
            $this->settings->forget('default_lead_source_id');
        }

        $source->delete();
    }

    /**
     * Create a project status.
     *
     * @param  array<string, mixed>  $attrs
     */
    public function createProjectStatus(array $attrs): ProjectStatus
    {
        $status = new ProjectStatus;
        $status->name = $attrs['name'];
        $status->color = $attrs['color'] ?? null;
        $status->status_order = $attrs['status_order'] ?? 0;
        $status->save();

        return $status;
    }

    /**
     * Delete a project status. Clears the default setting if this was the default.
     *
     * Reference guard wired in Phase 08 (Project model).
     */
    public function deleteProjectStatus(ProjectStatus $status): void
    {
        // reference guard wired in Phase 08: Project::where('status_id',$status->id)->exists() → abort(422)
        $defaultId = $this->settings->get('default_project_status_id');
        if ($defaultId === $status->id) {
            $this->settings->forget('default_project_status_id');
        }

        $status->delete();
    }

    /**
     * Return the default pipeline for the current workspace (via workspace_settings).
     */
    public function defaultPipeline(): ?Pipeline
    {
        $id = $this->settings->get('default_pipeline_id');
        if (! $id) {
            return null;
        }

        return Pipeline::find($id);
    }
}

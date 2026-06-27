<?php

namespace App\Services;

use App\Events\LeadAssigned;
use App\Events\LeadCreated;
use App\Events\LeadStageChanged;
use App\Models\Lead;
use App\Models\PipelineStage;
use App\Models\User;
use Modules\Tenancy\Models\WorkspaceSequence;
use App\Support\Activity\ActivityLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * P07 — Single entry-point for Lead write operations.
 * Business logic lives here; controllers are thin.
 *
 * kanban() returns stages-keyed paginated leads for a pipeline, filtered by
 * visibleTo scope. Assignment notification is fired inside assign().
 * G8 — moveStage validates stage belongs to the lead's pipeline.
 */
class LeadService
{
    public function __construct(
        private readonly CustomFieldService $customFieldService,
        private readonly ActivityLogger $activityLogger,
    ) {}

    /**
     * Create a lead. Sets lead_number via WorkspaceSequence, owner, custom fields.
     * Fires LeadCreated. If assigned_to is provided, also fires LeadAssigned.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): Lead
    {
        return DB::transaction(function () use ($attributes): Lead {
            $workspace = currentWorkspace();
            $userId = auth()->id();

            $lead = new Lead;
            $lead->fill($attributes);

            // System columns — not from user input
            $lead->lead_number = WorkspaceSequence::next('lead', $workspace->id);
            $lead->owner_id = $userId;
            $lead->created_by = $userId;

            // Apply custom fields before first save
            if (! empty($attributes['custom_fields'] ?? [])) {
                $this->customFieldService->apply($lead, $attributes['custom_fields']);
            }

            $lead->save();

            $this->activityLogger->log($lead, 'lead.created', [
                'lead_number' => $lead->lead_number,
                'name' => $lead->name,
            ]);

            event(new LeadCreated($lead));

            // Trigger assignment notification if assigned_to was set
            if (! empty($attributes['assigned_to'])) {
                $this->assign($lead, (int) $attributes['assigned_to']);
            }

            return $lead;
        });
    }

    /**
     * Update lead fields + custom fields.
     * If assigned_to changes, triggers assign() for notification.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function update(Lead $lead, array $attributes): Lead
    {
        return DB::transaction(function () use ($lead, $attributes): Lead {
            $previousAssignee = $lead->assigned_to;

            $lead->fill($attributes);

            if (! empty($attributes['custom_fields'] ?? [])) {
                $this->customFieldService->apply($lead, $attributes['custom_fields']);
            }

            $lead->updated_by = auth()->id();
            $lead->save();

            // Trigger assignment flow if assignee changed
            if (array_key_exists('assigned_to', $attributes)
                && $attributes['assigned_to'] !== $previousAssignee
            ) {
                $this->assign($lead, $attributes['assigned_to'] ? (int) $attributes['assigned_to'] : null);
            }

            return $lead;
        });
    }

    /**
     * Move a lead to a different stage (and reorder within that stage).
     * G8 — validates stage belongs to the lead's pipeline.
     * Logs lead.stage_changed activity and fires LeadStageChanged event.
     */
    public function moveStage(Lead $lead, string $stageId, int $order): Lead
    {
        return DB::transaction(function () use ($lead, $stageId, $order): Lead {
            // G8: guard stage belongs to this lead's pipeline
            $stageExists = PipelineStage::where('id', $stageId)
                ->where('pipeline_id', $lead->pipeline_id)
                ->where('workspace_id', currentWorkspace()->id)
                ->exists();

            if (! $stageExists) {
                throw ValidationException::withMessages([
                    'stage_id' => [__('leads.validation.stage_not_in_pipeline')],
                ]);
            }

            $previousStageId = $lead->stage_id;

            // Reindex leads in the target stage to make room at $order position
            $this->reorderLeadsInStage($lead, $stageId, $order);

            $lead->stage_id = $stageId;
            $lead->lead_order = $order;
            $lead->save();

            $this->activityLogger->log($lead, 'lead.stage_changed', [
                'from_stage_id' => $previousStageId,
                'to_stage_id' => $stageId,
            ]);

            event(new LeadStageChanged($lead, $previousStageId));

            return $lead;
        });
    }

    /**
     * Assign (or unassign) a lead. Logs lead.assigned activity.
     * Fires LeadAssigned event → SendLeadAssignedNotification listener.
     */
    public function assign(Lead $lead, ?int $userId): void
    {
        $lead->assigned_to = $userId;
        $lead->save();

        $this->activityLogger->log($lead, 'lead.assigned', [
            'to_user_id' => $userId,
        ]);

        event(new LeadAssigned($lead));
    }

    /**
     * Mark lead as lost. Caches current stage_id → last_stage_id so it can be restored.
     */
    public function markLost(Lead $lead): void
    {
        DB::transaction(function () use ($lead): void {
            $lead->last_stage_id = $lead->stage_id;
            $lead->is_lost = true;
            $lead->save();

            $this->activityLogger->log($lead, 'lead.marked_lost', [
                'cached_stage_id' => $lead->last_stage_id,
            ]);
        });
    }

    /**
     * Mark lead as junk. Caches current stage_id → last_stage_id.
     */
    public function markJunk(Lead $lead): void
    {
        DB::transaction(function () use ($lead): void {
            $lead->last_stage_id = $lead->stage_id;
            $lead->is_junk = true;
            $lead->save();

            $this->activityLogger->log($lead, 'lead.marked_junk', [
                'cached_stage_id' => $lead->last_stage_id,
            ]);
        });
    }

    /**
     * Restore a lost/junk lead. Returns it to the cached last_stage_id.
     * If last_stage_id is null (edge case: stage deleted), stays at current stage.
     */
    public function restore(Lead $lead): void
    {
        DB::transaction(function () use ($lead): void {
            if ($lead->last_stage_id !== null) {
                $lead->stage_id = $lead->last_stage_id;
                $lead->last_stage_id = null;
            }

            $lead->is_lost = false;
            $lead->is_junk = false;
            $lead->save();

            $this->activityLogger->log($lead, 'lead.restored', []);
        });
    }

    /**
     * Kanban board data: group leads by stage for a pipeline, filtered by visibleTo.
     * Returns list of stages with paginated leads and total value.
     *
     * @return list<array<string, mixed>>
     */
    public function kanban(string $pipelineId, User $viewer): array
    {
        $stages = PipelineStage::where('pipeline_id', $pipelineId)
            ->where('workspace_id', currentWorkspace()->id)
            ->orderBy('stage_order')
            ->get();

        $board = [];

        foreach ($stages as $stage) {
            $leads = Lead::visibleTo($viewer)
                ->where('pipeline_id', $pipelineId)
                ->where('stage_id', $stage->id)
                ->with([
                    'assignee:id,name',
                    'source:id,name',
                    'tags',
                ])
                ->orderBy('lead_order')
                ->paginate(20, ['*'], 'page_'.$stage->id);

            $board[] = [
                'stage' => $stage,
                'leads' => $leads,
                'total_value' => Lead::visibleTo($viewer)
                    ->where('pipeline_id', $pipelineId)
                    ->where('stage_id', $stage->id)
                    ->sum('lead_value'),
            ];
        }

        return $board;
    }

    // ─── Internal helpers ──────────────────────────────────────────────────────

    /**
     * Reindex leads in target stage to shift existing leads and avoid gaps.
     * Leads at or above $order get incremented by 1.
     */
    private function reorderLeadsInStage(Lead $movingLead, string $stageId, int $order): void
    {
        Lead::where('stage_id', $stageId)
            ->where('id', '!=', $movingLead->id)
            ->where('lead_order', '>=', $order)
            ->increment('lead_order');
    }
}

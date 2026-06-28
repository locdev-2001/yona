<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectMilestone;
use Illuminate\Support\Facades\DB;
use App\Support\Activity\ActivityLogger;

/**
 * P08 — Milestone write operations (create, update, reorder, delete).
 * reorder() sets milestone_order in transaction for kanban drag.
 */
class ProjectMilestoneService
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {}

    /**
     * Create a milestone within a project.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(Project $project, array $data): ProjectMilestone
    {
        return DB::transaction(function () use ($project, $data): ProjectMilestone {
            $maxOrder = ProjectMilestone::where('project_id', $project->id)
                ->max('milestone_order') ?? 0;

            $milestone = new ProjectMilestone;
            $milestone->workspace_id = $project->workspace_id;
            $milestone->project_id = $project->id;
            $milestone->fill($data);
            $milestone->milestone_order = $maxOrder + 1;
            $milestone->created_by = auth()->id();
            $milestone->updated_by = auth()->id();
            $milestone->save();

            $this->activityLogger->log($project, 'project_milestone_added', [
                'milestone_id' => $milestone->id,
                'milestone_name' => $milestone->name,
            ]);

            return $milestone;
        });
    }

    /**
     * Update a milestone's fields.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(ProjectMilestone $milestone, array $data): ProjectMilestone
    {
        $milestone->fill($data);
        $milestone->updated_by = auth()->id();
        $milestone->save();

        return $milestone;
    }

    /**
     * Reorder milestones by setting milestone_order from orderedIds array index.
     * Only milestones belonging to the project are updated (RLS backstop).
     *
     * @param  list<string>  $orderedIds
     */
    public function reorder(Project $project, array $orderedIds): void
    {
        DB::transaction(function () use ($project, $orderedIds): void {
            foreach ($orderedIds as $index => $milestoneId) {
                ProjectMilestone::where('id', $milestoneId)
                    ->where('project_id', $project->id) // scope to project — RLS backstop
                    ->update(['milestone_order' => $index]);
            }
        });
    }

    /**
     * Delete a milestone.
     * TODO(P09): reassign tasks with this milestone_id to null when tasks table exists.
     */
    public function delete(ProjectMilestone $milestone): void
    {
        $milestone->delete();
    }
}

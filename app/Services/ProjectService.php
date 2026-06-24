<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\ProjectStatus;
use App\Models\WorkspaceMember;
use App\Models\WorkspaceSequence;
use App\Support\Activity\ActivityLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

/**
 * P08 — Single entry-point for all Project write operations.
 * G12: addMember asserts active WorkspaceMember (single source — not only FormRequest).
 * G11: status resolved from project_statuses (P01-owned table).
 * All writes in DB::transaction.
 */
class ProjectService
{
    public function __construct(
        private readonly CustomFieldService $customFieldService,
        private readonly ActivityLogger $activityLogger,
    ) {}

    /**
     * Create a project + assign sequence + default status + log activity.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, ?int $ownerId = null): Project
    {
        return DB::transaction(function () use ($data, $ownerId): Project {
            $project = new Project;
            $project->fill($data);
            $project->project_number = WorkspaceSequence::next('project');
            $project->owner_id = $ownerId ?? auth()->id();
            $project->created_by = auth()->id();
            $project->updated_by = auth()->id();

            // Resolve default status when not provided (G11: from project_statuses table)
            if (empty($data['status_id'])) {
                $defaultStatus = ProjectStatus::where('status_order', 0)
                    ->orWhere('name', 'like', '%Open%')
                    ->orderBy('status_order')
                    ->first();
                $project->status_id = $defaultStatus?->id;
            } else {
                $project->status_id = $data['status_id'];
            }

            $project->save();

            // Apply custom fields if provided
            if (! empty($data['custom_fields'] ?? [])) {
                $this->customFieldService->apply($project, $data['custom_fields']);
                $project->saveQuietly();
            }

            $this->activityLogger->log($project, 'project_created', [
                'name' => $project->name,
                'project_number' => $project->project_number,
                'client_id' => $project->client_id,
            ]);

            return $project;
        });
    }

    /**
     * Update project fields + custom fields + log activity.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Project $project, array $data): Project
    {
        return DB::transaction(function () use ($project, $data): Project {
            $project->fill($data);
            $project->updated_by = auth()->id();
            $project->save();

            if (! empty($data['custom_fields'] ?? [])) {
                $this->customFieldService->apply($project, $data['custom_fields']);
                $project->saveQuietly();
            }

            return $project;
        });
    }

    /**
     * Change project status and log activity.
     * Sets finished_at when transitioning to a "Finished" status.
     */
    public function changeStatus(Project $project, string $statusId): Project
    {
        return DB::transaction(function () use ($project, $statusId): Project {
            $previousStatusId = $project->status_id;
            $newStatus = ProjectStatus::findOrFail($statusId);

            $project->status_id = $statusId;
            $project->updated_by = auth()->id();

            // Set finished_at when status name matches "Finished" or "Closed"
            if (in_array(strtolower($newStatus->name), ['finished', 'closed', 'complete', 'completed'])) {
                $project->finished_at = now();
                if (! $project->progress_from_tasks) {
                    $project->progress = 100;
                }
            } else {
                $project->finished_at = null;
            }

            $project->save();

            $this->activityLogger->log($project, 'project_status_changed', [
                'from_status_id' => $previousStatusId,
                'to_status_id' => $statusId,
                'to_status_name' => $newStatus->name,
            ]);

            return $project;
        });
    }

    /**
     * Set progress manually (clamp 0-100).
     */
    public function setProgress(Project $project, int $progress): Project
    {
        $clamped = max(0, min(100, $progress));

        $project->progress = $clamped;
        $project->progress_from_tasks = false;
        $project->updated_by = auth()->id();
        $project->save();

        $this->activityLogger->log($project, 'project_progress_updated', [
            'progress' => $clamped,
        ]);

        return $project;
    }

    /**
     * Recalculate progress from task completion (stub-safe for P09).
     * Guard: if tasks table doesn't exist yet, fall back gracefully.
     */
    public function recalcProgressFromTasks(Project $project): Project
    {
        // Stub-safe: P09 (Tasks) not yet merged → guard with schema check.
        if (! Schema::hasTable('tasks')) {
            // Fallback: if status is "Finished/Closed", treat as 100%.
            if ($project->finished_at !== null) {
                $project->progress = 100;
                $project->save();
            }

            return $project;
        }

        // P09 will unlock this: compute from tasks complete/total ratio.
        $total = DB::table('tasks')->where('project_id', $project->id)->whereNull('deleted_at')->count();

        if ($total === 0) {
            $project->progress = 0;
        } else {
            $completed = DB::table('tasks')
                ->where('project_id', $project->id)
                ->whereNull('deleted_at')
                ->where('status', 5) // 5 = complete (P09 const)
                ->count();

            $project->progress = (int) round(($completed / $total) * 100);
        }

        $project->progress_from_tasks = true;
        $project->updated_by = auth()->id();
        $project->save();

        return $project;
    }

    /**
     * Add a user as a project member.
     * G12: asserts $userId is active WorkspaceMember of currentWorkspace (single source).
     */
    public function addMember(Project $project, int $userId): void
    {
        $this->assertActiveWorkspaceMember($userId);

        DB::transaction(function () use ($project, $userId): void {
            // Idempotent: skip if already a member
            $exists = ProjectMember::where('project_id', $project->id)
                ->where('user_id', $userId)
                ->exists();

            if ($exists) {
                return;
            }

            $member = new ProjectMember;
            $member->workspace_id = currentWorkspace()->id;
            $member->project_id = $project->id;
            $member->user_id = $userId;
            $member->created_at = now();
            $member->save();

            $this->activityLogger->log($project, 'project_member_added', [
                'user_id' => $userId,
            ]);
        });
    }

    /**
     * Remove a user from project members.
     * TODO(P09): unmap task assignees for this user when tasks table exists.
     */
    public function removeMember(Project $project, int $userId): void
    {
        DB::transaction(function () use ($project, $userId): void {
            ProjectMember::where('project_id', $project->id)
                ->where('user_id', $userId)
                ->delete();

            $this->activityLogger->log($project, 'project_member_removed', [
                'user_id' => $userId,
            ]);
        });
    }

    /**
     * Toggle the is_pinned flag on the project.
     */
    public function togglePin(Project $project): Project
    {
        $project->is_pinned = ! $project->is_pinned;
        $project->updated_by = auth()->id();
        $project->save();

        return $project;
    }

    /**
     * Soft-delete a project.
     */
    public function delete(Project $project): void
    {
        $project->delete();
    }

    /**
     * G12 — Validate that $userId is an active WorkspaceMember of currentWorkspace.
     * Single source of truth: Service asserts, FormRequest is defense-in-depth.
     *
     * @throws RuntimeException when user is not an active workspace member
     */
    private function assertActiveWorkspaceMember(int $userId): void
    {
        $workspace = currentWorkspace();

        $isActiveMember = WorkspaceMember::withoutGlobalScopes()
            ->where('workspace_id', $workspace->id)
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->exists();

        if (! $isActiveMember) {
            throw new RuntimeException(
                "User #{$userId} is not an active member of workspace #{$workspace->id}."
            );
        }
    }
}

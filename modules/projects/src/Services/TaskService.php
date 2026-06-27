<?php

namespace Modules\Projects\Services;

use Modules\Projects\Models\Task;
use Modules\Projects\Models\TaskChecklistItem;
use App\Notifications\EntityNotification;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Modules\Identity\Models\User;
use Modules\Shared\Services\CustomFieldService;
use Modules\Tenancy\Models\WorkspaceMember;
use Modules\Tenancy\Models\WorkspaceSequence;
use RuntimeException;

/**
 * Single-entry-point for all Task writes (BR-X12 server-controlled fields).
 * All methods run in DB::transaction. Logic lives here — controller is thin.
 * G12: member validation, related consistency guard, atomic ops.
 */
class TaskService
{
    public function __construct(
        private readonly CustomFieldService $customFieldService,
        private readonly \App\Services\NotificationService $notificationService,
        private readonly TaskTimerService $timerService,
    ) {}

    /**
     * Create a new task with optional related-to, assignees, custom fields.
     * G12: related_type/related_id must both be set or both null (consistency guard).
     */
    public function create(
        array $data,
        ?string $relatedType,
        ?string $relatedId,
        array $assigneeIds,
        array $customFields,
    ): Task {
        return DB::transaction(function () use ($data, $relatedType, $relatedId, $assigneeIds, $customFields) {
            $workspace = currentWorkspace();

            if (! $workspace) {
                throw new RuntimeException('Workspace context required.');
            }

            $this->guardRelatedConsistency($relatedType, $relatedId);

            $task = new Task;
            $task->workspace_id = $workspace->id;
            $task->task_number = WorkspaceSequence::next('task', $workspace->id);
            $task->name = $data['name'];
            $task->description = $data['description'] ?? null;
            $task->priority = $data['priority'] ?? Task::PRIORITY_MEDIUM;
            $task->start_date = $data['start_date'] ?? null;
            $task->due_date = $data['due_date'] ?? null;
            $task->billable = (bool) ($data['billable'] ?? false);
            $task->hourly_rate = $data['hourly_rate'] ?? null;
            $task->visible_to_customer = (bool) ($data['visible_to_customer'] ?? false);
            $task->status = Task::STATUS_NOT_STARTED;
            $task->owner_id = auth()->id();
            $task->created_by = auth()->id();

            // G12 related guard — set atomically
            if ($relatedType !== null && $relatedId !== null) {
                if (! in_array($relatedType, Task::RELATED_TYPES, strict: true)) {
                    throw new InvalidArgumentException("Invalid related_type: {$relatedType}");
                }
                $task->related_type = $relatedType;
                $task->related_id = $relatedId;
            }

            // milestone_id only valid when related_type = project
            if (isset($data['milestone_id']) && $relatedType === 'project') {
                $task->milestone_id = $data['milestone_id'];
            }

            // kanban_order = max + 1 in the new status column
            $task->kanban_order = $this->nextKanbanOrder($workspace->id, Task::STATUS_NOT_STARTED);

            $task->save();

            // Apply custom fields (G6 — asserts entity type matches)
            if (! empty($customFields)) {
                $this->customFieldService->apply($task, $customFields);
                $task->save();
            }

            // Sync assignees
            if (! empty($assigneeIds)) {
                $this->assign($task, $assigneeIds, auth()->user());
            }

            $task->logActivity('task.created', ['name' => $task->name]);

            return $task;
        });
    }

    /**
     * Update task fields. related_type/related_id updated atomically (G12).
     * Optimistic lock checked via HasOptimisticLock trait (lock_version).
     */
    public function update(Task $task, array $data, array $customFields): Task
    {
        return DB::transaction(function () use ($task, $data, $customFields) {
            $relatedType = $data['related_type'] ?? $task->related_type;
            $relatedId = $data['related_id'] ?? $task->related_id;

            // Normalise: if one is empty string treat as null
            $relatedType = $relatedType ?: null;
            $relatedId = $relatedId ?: null;

            $this->guardRelatedConsistency($relatedType, $relatedId);

            $task->fill(array_intersect_key($data, array_flip([
                'name', 'description', 'priority', 'start_date', 'due_date',
                'billable', 'hourly_rate', 'visible_to_customer',
            ])));

            // Set related atomically (G12 — both columns at once)
            $task->related_type = $relatedType;
            $task->related_id = $relatedId;

            // Reset milestone if related_type is no longer project
            if ($relatedType !== 'project') {
                $task->milestone_id = null;
            } elseif (isset($data['milestone_id'])) {
                $task->milestone_id = $data['milestone_id'];
            }

            $task->updated_by = auth()->id();
            $task->save();

            if (! empty($customFields)) {
                $this->customFieldService->apply($task, $customFields);
                $task->save();
            }

            $task->logActivity('task.updated', ['name' => $task->name]);

            return $task;
        });
    }

    /**
     * Change task status. Handles: finished_at, auto-stop running timers on complete,
     * kanban_order reset to end of new column, activity log.
     */
    public function changeStatus(Task $task, int $status): Task
    {
        return DB::transaction(function () use ($task, $status) {
            if (! in_array($status, Task::STATUSES, strict: true)) {
                throw new InvalidArgumentException("Invalid status: {$status}");
            }

            $oldStatus = $task->status;
            $task->status = $status;

            if ($status === Task::STATUS_COMPLETE) {
                $task->finished_at = now();
                // Edge-case: mark complete → auto-stop all running timers
                $this->timerService->stopAllRunningForTask($task);
            } elseif ($oldStatus === Task::STATUS_COMPLETE) {
                // Leaving complete status → clear finished_at
                $task->finished_at = null;
            }

            // Move to end of new status column
            $task->kanban_order = $this->nextKanbanOrder($task->workspace_id, $status);
            $task->updated_by = auth()->id();
            $task->save();

            $task->logActivity('task.status_changed', [
                'old_status' => $oldStatus,
                'new_status' => $status,
            ]);

            return $task;
        });
    }

    /**
     * Reorder task within kanban column (may also change status column).
     */
    public function reorderKanban(Task $task, int $status, int $order): void
    {
        DB::transaction(function () use ($task, $status, $order) {
            $oldStatus = $task->status;
            $task->status = $status;
            $task->kanban_order = $order;

            if ($status === Task::STATUS_COMPLETE && $oldStatus !== Task::STATUS_COMPLETE) {
                $task->finished_at = now();
                $this->timerService->stopAllRunningForTask($task);
            } elseif ($oldStatus === Task::STATUS_COMPLETE && $status !== Task::STATUS_COMPLETE) {
                $task->finished_at = null;
            }

            $task->updated_by = auth()->id();
            $task->save();

            if ($oldStatus !== $status) {
                $task->logActivity('task.status_changed', [
                    'old_status' => $oldStatus,
                    'new_status' => $status,
                    'via' => 'kanban',
                ]);
            }
        });
    }

    /**
     * Sync assignees. G12: validate all user_ids are active WorkspaceMembers.
     * Gỡ assignee → stop running timer of that user on this task.
     * Thêm assignee → notify.
     */
    public function assign(Task $task, array $userIds, ?User $by): void
    {
        DB::transaction(function () use ($task, $userIds, $by) {
            $workspace = currentWorkspace();

            if ($workspace) {
                $this->guardActiveMembersExist($workspace->id, $userIds);
            }

            $currentIds = $task->assignees()->pluck('users.id')->all();
            $addedIds = array_diff($userIds, $currentIds);
            $removedIds = array_diff($currentIds, $userIds);

            // Build pivot values: assigned_by + workspace_id (required for RLS WITH CHECK).
            $pivotValues = [];
            foreach ($userIds as $userId) {
                $pivotValues[$userId] = [
                    'assigned_by' => $by !== null ? $by->id : auth()->id(),
                    'workspace_id' => $task->workspace_id,
                ];
            }

            $task->assignees()->sync($pivotValues);

            // Stop timers for removed assignees
            foreach ($removedIds as $userId) {
                $user = User::find($userId);
                if ($user) {
                    $this->timerService->stopRunningForUserOnTask($task, $user);
                }
            }

            // Notify newly added assignees
            if (! empty($addedIds)) {
                $addedUsers = User::whereIn('id', array_values($addedIds))->get();
                foreach ($addedUsers as $assignee) {
                    $this->notificationService->notify($assignee, new EntityNotification(
                        action: 'task.assigned',
                        subject: $task,
                        payload: ['task_name' => $task->name],
                        link: route('tasks.show', $task),
                    ));
                }
            }

            if (! empty($addedIds) || ! empty($removedIds)) {
                $task->logActivity('task.assignees_changed', [
                    'added' => array_values($addedIds),
                    'removed' => array_values($removedIds),
                ]);
            }
        });
    }

    /**
     * Sync followers (should — table exists, UI optional).
     * G12: validate active members.
     */
    public function syncFollowers(Task $task, array $userIds): void
    {
        DB::transaction(function () use ($task, $userIds) {
            $workspace = currentWorkspace();
            if ($workspace && ! empty($userIds)) {
                $this->guardActiveMembersExist($workspace->id, $userIds);
            }

            // Include workspace_id in pivot values for RLS WITH CHECK compliance.
            $pivotValues = collect($userIds)->mapWithKeys(fn ($uid) => [
                $uid => ['workspace_id' => $task->workspace_id],
            ])->all();
            $task->followers()->sync($pivotValues);
        });
    }

    /**
     * Add checklist item. G12: assigned_user_id must be active WorkspaceMember.
     */
    public function addChecklistItem(Task $task, string $description, ?int $assignedUserId): TaskChecklistItem
    {
        return DB::transaction(function () use ($task, $description, $assignedUserId) {
            $workspace = currentWorkspace();

            if ($assignedUserId !== null && $workspace) {
                $this->guardActiveMembersExist($workspace->id, [$assignedUserId]);
            }

            $maxOrder = $task->checklistItems()->max('item_order') ?? 0;

            $item = new TaskChecklistItem;
            $item->workspace_id = $task->workspace_id;
            $item->task_id = $task->id;
            $item->description = $description;
            $item->finished = false;
            $item->assigned_user_id = $assignedUserId;
            $item->item_order = $maxOrder + 1;
            $item->created_by = auth()->id();
            $item->save();

            return $item;
        });
    }

    /** Toggle checklist item finished/unfinished. */
    public function toggleChecklistItem(TaskChecklistItem $item): TaskChecklistItem
    {
        return DB::transaction(function () use ($item) {
            $item->finished = ! $item->finished;

            if ($item->finished) {
                $item->finished_by = auth()->id();
                $item->finished_at = now();
            } else {
                $item->finished_by = null;
                $item->finished_at = null;
            }

            $item->save();

            return $item;
        });
    }

    /** Reorder checklist items by providing new ordered list of IDs. */
    public function reorderChecklist(Task $task, array $orderedIds): void
    {
        DB::transaction(function () use ($task, $orderedIds) {
            foreach ($orderedIds as $order => $itemId) {
                TaskChecklistItem::where('task_id', $task->id)
                    ->where('id', $itemId)
                    ->update(['item_order' => $order]);
            }
        });
    }

    /** Delete checklist item. */
    public function deleteChecklistItem(TaskChecklistItem $item): void
    {
        $item->delete();
    }

    /**
     * Soft-delete task and clean up polymorphic children.
     * FK cascade handles assignees/followers/checklist/timers (hard delete).
     * Polymorphic children (comments/attachments/tags/reminders/activities)
     * must be cleaned explicitly before soft-delete.
     */
    public function delete(Task $task): void
    {
        DB::transaction(function () use ($task) {
            // Clean polymorphic children (trait-managed, no cascade)
            $task->comments()->delete();
            $task->attachments()->delete();
            $task->tags()->detach();
            $task->reminders()->delete();
            $task->activities()->delete();

            // Soft-delete the task (FK cascade handles hard-delete of timers/checklist/assignees/followers)
            $task->delete();
        });
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    /**
     * G12 — both null or both set; reject mixed state.
     */
    private function guardRelatedConsistency(?string $relatedType, ?string $relatedId): void
    {
        $typeSet = $relatedType !== null;
        $idSet = $relatedId !== null;

        if ($typeSet !== $idSet) {
            throw new InvalidArgumentException(
                'related_type and related_id must both be set or both null (G12 consistency guard).'
            );
        }

        if ($typeSet && ! in_array($relatedType, Task::RELATED_TYPES, strict: true)) {
            throw new InvalidArgumentException("Invalid related_type: {$relatedType}");
        }
    }

    /**
     * G12 — validate that all user IDs are active WorkspaceMembers.
     *
     * @param  array<int|string>  $userIds
     */
    private function guardActiveMembersExist(string $workspaceId, array $userIds): void
    {
        if (empty($userIds)) {
            return;
        }

        $activeMemberUserIds = WorkspaceMember::withoutGlobalScope('workspace')
            ->where('workspace_id', $workspaceId)
            ->where('status', 'active')
            ->whereIn('user_id', $userIds)
            ->pluck('user_id')
            ->all();

        $missing = array_diff($userIds, $activeMemberUserIds);

        if (! empty($missing)) {
            throw new InvalidArgumentException(
                'One or more user IDs are not active members of this workspace (G12).'
            );
        }
    }

    /** Get next kanban_order for a given status column in a workspace. */
    private function nextKanbanOrder(string $workspaceId, int $status): int
    {
        $row = DB::selectOne(
            'SELECT MAX(kanban_order) AS max_order FROM tasks WHERE workspace_id = ? AND status = ? AND deleted_at IS NULL',
            [$workspaceId, $status]
        );

        return (int) ($row !== null ? $row->max_order : 0) + 1;
    }
}

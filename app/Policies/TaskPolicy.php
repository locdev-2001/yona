<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\TaskTimer;
use App\Models\User;

/**
 * Task authorization (G2). Permission format: tenant.task.{action}.
 * Creator/assignee override: can update tasks they own or are assigned to,
 * even without tenant.task.update (Perfex edge-case).
 * Visibility fail → abort(404) not 403 (BR-X15 non-enumeration).
 */
class TaskPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tenant.task.view') || $user->can('tenant.task.view_own');
    }

    public function view(User $user, Task $task): bool
    {
        if ($user->can('tenant.task.view')) {
            return true;
        }

        if ($user->can('tenant.task.view_own')) {
            // Can see tasks they own, are assigned to, or follow
            return $task->owner_id === $user->id
                || $task->assignees->contains($user)
                || $task->followers->contains($user);
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->can('tenant.task.create');
    }

    public function update(User $user, Task $task): bool
    {
        // Full permission
        if ($user->can('tenant.task.update')) {
            return true;
        }

        // Creator/assignee override (G2 edge-case — Perfex behaviour)
        return $task->owner_id === $user->id
            || $task->assignees->contains($user);
    }

    public function delete(User $user, Task $task): bool
    {
        if ($user->can('tenant.task.delete')) {
            return true;
        }

        // Owner can delete their own tasks
        return $task->owner_id === $user->id;
    }

    /**
     * Log time on a task: assignee/owner, or has update permission.
     * billed guard lives in TaskTimerService (single source).
     */
    public function logTime(User $user, Task $task): bool
    {
        if ($user->can('tenant.task.update')) {
            return true;
        }

        return $task->owner_id === $user->id
            || $task->assignees->contains($user);
    }

    /**
     * Manage timesheet entry (update/delete). Entry owner or timesheet permission.
     * G2: tenant.task.timesheet.update / tenant.task.timesheet.delete checked in controller.
     */
    public function manageTimesheet(User $user, TaskTimer $timer): bool
    {
        if ($user->can('tenant.task.timesheet.update')) {
            return true;
        }

        // Entry owner can manage their own entries
        return (int) $timer->user_id === $user->id;
    }
}

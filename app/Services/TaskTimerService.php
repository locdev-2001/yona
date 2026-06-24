<?php

namespace App\Services;

use App\Models\Task;
use App\Models\TaskTimer;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * Owns all timer write operations. Single source of truth for billed-guard,
 * 1-running-timer/user guard, and auto-stop logic.
 * billed=true → immutable: all entry points (start/stop/edit/delete) throw.
 */
class TaskTimerService
{
    /**
     * Start a timer for the user on this task.
     * Guards: billed, 1-running/user (auto-stop previous), task must allow.
     */
    public function start(Task $task, User $user): TaskTimer
    {
        return DB::transaction(function () use ($task, $user) {
            if ($task->isBilled()) {
                throw new RuntimeException(__('tasks.timer.billed_locked'));
            }

            // Auto-stop existing running timer for this user (Perfex behaviour)
            $this->stopRunningForUser($user, $task->workspace_id);

            $timer = new TaskTimer;
            $timer->workspace_id = $task->workspace_id;
            $timer->task_id = $task->id;
            $timer->user_id = $user->id;
            $timer->start_time = now();
            $timer->end_time = null;
            // Snapshot hourly_rate at start — not updated retroactively
            $timer->hourly_rate = $task->hourly_rate !== null ? (string) $task->hourly_rate : null;
            $timer->save();

            $task->logActivity('timer.started', ['user_id' => $user->id]);

            return $timer;
        });
    }

    /**
     * Stop a running timer.
     */
    public function stop(TaskTimer $timer): TaskTimer
    {
        return DB::transaction(function () use ($timer) {
            if ($timer->task?->isBilled()) {
                throw new RuntimeException(__('tasks.timer.billed_locked'));
            }

            if (! $timer->isRunning()) {
                throw new RuntimeException('Timer is not running.');
            }

            $timer->end_time = now();
            $timer->save();

            $timer->task?->logActivity('timer.stopped', [
                'user_id' => $timer->user_id,
                'duration_seconds' => $timer->duration_seconds,
            ]);

            return $timer;
        });
    }

    /**
     * Log a manual timer entry (start + end explicitly provided).
     * G12: end must be after start.
     */
    public function logManual(Task $task, User $user, Carbon $start, Carbon $end, ?string $note): TaskTimer
    {
        return DB::transaction(function () use ($task, $user, $start, $end, $note) {
            if ($task->isBilled()) {
                throw new RuntimeException(__('tasks.timer.billed_locked'));
            }

            if (! $end->greaterThan($start)) {
                throw new InvalidArgumentException('end_time must be after start_time.');
            }

            $timer = new TaskTimer;
            $timer->workspace_id = $task->workspace_id;
            $timer->task_id = $task->id;
            $timer->user_id = $user->id;
            $timer->start_time = $start;
            $timer->end_time = $end;
            $timer->hourly_rate = $task->hourly_rate !== null ? (string) $task->hourly_rate : null;
            $timer->note = $note;
            $timer->save();

            $task->logActivity('timer.logged_manual', [
                'user_id' => $user->id,
                'duration_seconds' => $timer->duration_seconds,
            ]);

            return $timer;
        });
    }

    /**
     * Update a timer entry. Guard: billed + permission checked in Policy/Controller.
     */
    public function updateEntry(TaskTimer $timer, array $data): TaskTimer
    {
        return DB::transaction(function () use ($timer, $data) {
            if ($timer->task?->isBilled()) {
                throw new RuntimeException(__('tasks.timer.billed_locked'));
            }

            if (isset($data['start_time'])) {
                $timer->start_time = $data['start_time'];
            }

            if (isset($data['end_time'])) {
                $timer->end_time = $data['end_time'];
            }

            if (isset($data['note'])) {
                $timer->note = $data['note'];
            }

            if ($timer->end_time !== null && ! $timer->end_time->greaterThan($timer->start_time)) {
                throw new InvalidArgumentException('end_time must be after start_time.');
            }

            $timer->save();

            return $timer;
        });
    }

    /**
     * Delete a timer entry. Guard: billed.
     */
    public function deleteEntry(TaskTimer $timer): void
    {
        DB::transaction(function () use ($timer) {
            if ($timer->task?->isBilled()) {
                throw new RuntimeException(__('tasks.timer.billed_locked'));
            }

            $timer->delete();
        });
    }

    /**
     * Stop all running timers for a task (called when task is marked complete).
     */
    public function stopAllRunningForTask(Task $task): void
    {
        TaskTimer::withoutGlobalScope('workspace')
            ->where('workspace_id', $task->workspace_id)
            ->where('task_id', $task->id)
            ->whereNull('end_time')
            ->update(['end_time' => now()]);
    }

    /**
     * Stop running timer for a specific user on a specific task (called when assignee removed).
     */
    public function stopRunningForUserOnTask(Task $task, User $user): void
    {
        TaskTimer::withoutGlobalScope('workspace')
            ->where('workspace_id', $task->workspace_id)
            ->where('task_id', $task->id)
            ->where('user_id', $user->id)
            ->whereNull('end_time')
            ->update(['end_time' => now()]);
    }

    /**
     * Stop any running timer for a user across the workspace (auto-stop on new start).
     */
    private function stopRunningForUser(User $user, string $workspaceId): void
    {
        TaskTimer::withoutGlobalScope('workspace')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $user->id)
            ->whereNull('end_time')
            ->update(['end_time' => now()]);
    }
}

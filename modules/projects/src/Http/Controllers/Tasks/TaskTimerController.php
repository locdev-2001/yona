<?php

namespace Modules\Projects\Http\Controllers\Tasks;

use App\Http\Controllers\Controller;
use Modules\Projects\Http\Requests\Tasks\TimerLogRequest;
use Modules\Projects\Models\Task;
use Modules\Projects\Models\TaskTimer;
use Modules\Projects\Services\TaskTimerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Task timer CRUD: start, stop, manual log, update entry, delete entry.
 * billed guard enforced in TaskTimerService (single source).
 */
class TaskTimerController extends Controller
{
    public function __construct(private readonly TaskTimerService $timerService) {}

    /** Start timer (POST tasks/{task}/timers). */
    public function start(Task $task): RedirectResponse
    {
        $this->authorize('logTime', $task);

        $this->timerService->start($task, request()->user());

        return back()->with('success', __('tasks.timer_started'));
    }

    /** Stop a running timer (PATCH tasks/{task}/timers/{timer}/stop). */
    public function stop(Task $task, TaskTimer $timer): RedirectResponse
    {
        $this->authorize('logTime', $task);

        $this->timerService->stop($timer);

        return back()->with('success', __('tasks.timer_stopped'));
    }

    /** Manual log entry (POST tasks/{task}/timers/log). */
    public function logManual(TimerLogRequest $request, Task $task): RedirectResponse
    {
        $this->timerService->logManual(
            task: $task,
            user: $request->user(),
            start: Carbon::parse($request->input('start_time')),
            end: Carbon::parse($request->input('end_time')),
            note: $request->input('note'),
        );

        return back()->with('success', __('tasks.timer_logged'));
    }

    /** Update timer entry (PATCH tasks/{task}/timers/{timer}). */
    public function update(Request $request, Task $task, TaskTimer $timer): RedirectResponse
    {
        $this->authorize('manageTimesheet', $timer);

        $request->validate([
            'start_time' => ['required', 'date'],
            'end_time' => ['required', 'date', 'after:start_time'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $this->timerService->updateEntry($timer, [
            'start_time' => Carbon::parse($request->input('start_time')),
            'end_time' => Carbon::parse($request->input('end_time')),
            'note' => $request->input('note'),
        ]);

        return back()->with('success', __('tasks.timer_updated'));
    }

    /** Delete timer entry (DELETE tasks/{task}/timers/{timer}). */
    public function destroy(Task $task, TaskTimer $timer): RedirectResponse
    {
        $user = request()->user();

        // manageTimesheet check: owner or has timesheet.delete permission
        if (! ($user->can('tenant.task.timesheet.delete') || (int) $timer->user_id === $user->id)) {
            abort(403);
        }

        $this->timerService->deleteEntry($timer);

        return back()->with('success', __('tasks.timer_deleted'));
    }
}

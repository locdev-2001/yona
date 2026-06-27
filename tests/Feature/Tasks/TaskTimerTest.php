<?php

use App\Models\Task;
use App\Models\TaskTimer;
use App\Models\User;
use Modules\Tenancy\Models\Workspace;
use App\Services\TaskService;
use App\Services\TaskTimerService;

// ── Timer start/stop/manual/guard ─────────────────────────────────────────────

it('starts a timer (end_time null = running)', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $task = app(TaskService::class)->create(['name' => 'Timer Test'], null, null, [$user->id], []);
    $timer = app(TaskTimerService::class)->start($task, $user);

    expect($timer->end_time)->toBeNull();
    expect($timer->task_id)->toBe($task->id);
    expect($timer->user_id)->toBe($user->id);
});

it('auto-stops previous running timer when new timer starts (1-running/user guard)', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(TaskService::class);
    $timerService = app(TaskTimerService::class);

    $task1 = $service->create(['name' => 'Task 1'], null, null, [$user->id], []);
    $task2 = $service->create(['name' => 'Task 2'], null, null, [$user->id], []);

    $timer1 = $timerService->start($task1, $user);
    $timer2 = $timerService->start($task2, $user);

    // timer1 should be stopped
    expect($timer1->fresh()->end_time)->not->toBeNull();
    // timer2 should be running
    expect($timer2->end_time)->toBeNull();
});

it('stops a running timer', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $task = app(TaskService::class)->create(['name' => 'Stop Test'], null, null, [$user->id], []);
    $timerService = app(TaskTimerService::class);

    $timer = $timerService->start($task, $user);
    $stopped = $timerService->stop($timer);

    expect($stopped->end_time)->not->toBeNull();
});

it('rejects manual log when end before start', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $task = app(TaskService::class)->create(['name' => 'Manual Reject'], null, null, [$user->id], []);
    $timerService = app(TaskTimerService::class);

    $start = now()->subHour();
    $end = now()->subHours(2); // end before start

    expect(fn () => $timerService->logManual($task, $user, $start, $end, null))
        ->toThrow(InvalidArgumentException::class);
});

it('blocks start when task is billed', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $task = app(TaskService::class)->create(['name' => 'Billed Task'], null, null, [$user->id], []);
    // Force billed = true (M3 would do this; we set directly for test)
    $task->billed = true;
    $task->save();

    expect(fn () => app(TaskTimerService::class)->start($task, $user))
        ->toThrow(RuntimeException::class);
});

it('auto-stops all timers when task is marked complete', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $taskService = app(TaskService::class);
    $timerService = app(TaskTimerService::class);

    $task = $taskService->create(['name' => 'Complete Stop'], null, null, [$user->id], []);
    $timer = $timerService->start($task, $user);

    $taskService->changeStatus($task, Task::STATUS_COMPLETE);

    expect($timer->fresh()->end_time)->not->toBeNull();
});

it('manual log via route', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $task = app(TaskService::class)->create(['name' => 'Log Route'], null, null, [$user->id], []);

    $response = test()->post(route('tasks.timers.log', $task), [
        'start_time' => now()->subHour()->format('Y-m-d H:i:s'),
        'end_time' => now()->format('Y-m-d H:i:s'),
        'note' => 'Manual note',
    ]);

    $response->assertRedirect();
    expect(TaskTimer::where('task_id', $task->id)->count())->toBe(1);
});

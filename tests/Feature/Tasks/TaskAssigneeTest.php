<?php

use App\Models\User;
use Modules\Tenancy\Models\Workspace;
use App\Services\TaskService;
use App\Services\TaskTimerService;

// ── Multi-assignee + notification + timer stop ─────────────────────────────────

it('assigns multiple users to a task', function () {
    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    $assignee1 = User::factory()->create();
    $assignee2 = User::factory()->create();

    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');
    seedMember($workspace, $assignee1, 'support_agent');
    seedMember($workspace, $assignee2, 'support_agent');

    $service = app(TaskService::class);
    $task = $service->create(['name' => 'Multi Assign'], null, null, [$assignee1->id, $assignee2->id], []);

    expect($task->assignees->pluck('id')->sort()->values()->all())
        ->toBe(collect([$assignee1->id, $assignee2->id])->sort()->values()->all());
});

it('rejects assigning user not in workspace (G12 member validation)', function () {
    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    $outsider = User::factory()->create(); // not a member

    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');

    $service = app(TaskService::class);

    expect(fn () => $service->create(['name' => 'Restricted'], null, null, [$outsider->id], []))
        ->toThrow(InvalidArgumentException::class);
});

it('stops running timer when assignee is removed', function () {
    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    $assignee = User::factory()->create();

    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');
    seedMember($workspace, $assignee, 'support_agent');

    $service = app(TaskService::class);
    $timerService = app(TaskTimerService::class);

    $task = $service->create(['name' => 'Timer Task'], null, null, [$assignee->id], []);
    $timer = $timerService->start($task, $assignee);

    expect($timer->end_time)->toBeNull(); // running

    // Remove assignee → timer should stop
    $service->assign($task, [], $owner);

    expect($timer->fresh()->end_time)->not->toBeNull();
});

it('assign updates via route', function () {
    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    $assignee = User::factory()->create();

    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');
    seedMember($workspace, $assignee, 'support_agent');

    $service = app(TaskService::class);
    $task = $service->create(['name' => 'Assign Route'], null, null, [], []);

    $response = test()->patch(route('tasks.assignees.update', $task), [
        'user_ids' => [$assignee->id],
    ]);

    $response->assertRedirect();
    expect($task->fresh()->assignees->contains($assignee))->toBeTrue();
});

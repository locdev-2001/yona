<?php

use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use App\Services\TaskService;

// ── Kanban status + reorder ────────────────────────────────────────────────────

it('changes task status via service and sets finished_at for complete', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(TaskService::class);
    $task = $service->create(['name' => 'Status Test'], null, null, [], []);

    expect($task->status)->toBe(Task::STATUS_NOT_STARTED);
    expect($task->finished_at)->toBeNull();

    $service->changeStatus($task, Task::STATUS_COMPLETE);

    expect($task->fresh()->status)->toBe(Task::STATUS_COMPLETE);
    expect($task->fresh()->finished_at)->not->toBeNull();
});

it('clears finished_at when leaving complete status', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(TaskService::class);
    $task = $service->create(['name' => 'Unfinish Test'], null, null, [], []);

    $service->changeStatus($task, Task::STATUS_COMPLETE);
    $service->changeStatus($task->fresh(), Task::STATUS_IN_PROGRESS);

    expect($task->fresh()->finished_at)->toBeNull();
    expect($task->fresh()->status)->toBe(Task::STATUS_IN_PROGRESS);
});

it('reorders task via kanban-order route', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(TaskService::class);
    $task = $service->create(['name' => 'Reorder Test'], null, null, [], []);

    $response = test()->patch(route('tasks.kanban-order', $task), [
        'status' => Task::STATUS_IN_PROGRESS,
        'order' => 3,
    ]);

    $response->assertRedirect();
    expect($task->fresh()->status)->toBe(Task::STATUS_IN_PROGRESS);
    expect($task->fresh()->kanban_order)->toBe(3);
});

it('changes status via status route', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $task = app(TaskService::class)->create(['name' => 'Status Route'], null, null, [], []);

    $response = test()->patch(route('tasks.status', $task), ['status' => Task::STATUS_TESTING]);

    $response->assertRedirect();
    expect($task->fresh()->status)->toBe(Task::STATUS_TESTING);
});

it('kanban view groups tasks by status', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(TaskService::class);
    $task1 = $service->create(['name' => 'Not Started'], null, null, [], []);
    $task2 = $service->create(['name' => 'In Progress'], null, null, [], []);
    $service->changeStatus($task2, Task::STATUS_IN_PROGRESS);

    $response = test()->get(route('tasks.kanban'));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page->component('projects/tasks/kanban')->has('columns'));
});

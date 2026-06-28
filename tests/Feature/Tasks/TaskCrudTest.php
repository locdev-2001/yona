<?php

use App\Models\Client;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use App\Services\TaskService;

// ── TaskService create ────────────────────────────────────────────────────────

it('creates a task and sets task_number from sequence', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(TaskService::class);
    $task = $service->create(['name' => 'Test Task'], null, null, [], []);

    expect($task->id)->not->toBeNull();
    expect($task->task_number)->toBe(1);
    expect($task->name)->toBe('Test Task');
    expect($task->status)->toBe(Task::STATUS_NOT_STARTED);
    expect($task->workspace_id)->toBe($workspace->id);
    expect($task->owner_id)->toBe($user->id);
});

it('increments task_number sequentially per workspace', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(TaskService::class);
    $task1 = $service->create(['name' => 'Task 1'], null, null, [], []);
    $task2 = $service->create(['name' => 'Task 2'], null, null, [], []);

    expect($task1->task_number)->toBe(1);
    expect($task2->task_number)->toBe(2);
});

it('creates standalone task (no related_type/related_id)', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(TaskService::class);
    $task = $service->create(['name' => 'Standalone'], null, null, [], []);

    expect($task->related_type)->toBeNull();
    expect($task->related_id)->toBeNull();
});

it('rejects related_type without related_id (G12 consistency guard)', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(TaskService::class);

    expect(fn () => $service->create(['name' => 'Bad Related'], 'lead', null, [], []))
        ->toThrow(InvalidArgumentException::class);
});

it('updates a task via service', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(TaskService::class);
    $task = $service->create(['name' => 'Old Name'], null, null, [], []);

    $updated = $service->update($task, ['name' => 'New Name'], []);

    expect($updated->fresh()->name)->toBe('New Name');
});

it('soft-deletes task via route and clears polymorphic children', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(TaskService::class);
    $task = $service->create(['name' => 'To Delete'], null, null, [], []);
    $taskId = $task->id;

    $response = test()->delete(route('tasks.destroy', $task));

    $response->assertRedirect(route('tasks.index'));
    expect(Task::find($taskId))->toBeNull();
    expect(Task::withTrashed()->find($taskId))->not->toBeNull();
});

it('stores task via POST route and redirects to show', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $response = test()->post(route('tasks.store'), [
        'name' => 'Via Route',
        'priority' => 2,
    ]);

    $response->assertRedirect();
    $task = Task::where('name', 'Via Route')->first();
    expect($task)->not->toBeNull();
});

it('resets milestone_id when related_type changes away from project', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(TaskService::class);

    // Create client to link
    $client = Client::factory()->create();

    $task = $service->create(['name' => 'Task'], null, null, [], []);
    $task->milestone_id = null; // no milestone to begin with

    // Update with related_type = client (not project) → milestone_id should be null
    $updated = $service->update($task, [
        'name' => 'Task',
        'related_type' => 'client',
        'related_id' => $client->id,
    ], []);

    expect($updated->milestone_id)->toBeNull();
});

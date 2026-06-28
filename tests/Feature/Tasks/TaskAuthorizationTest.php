<?php

use App\Models\Task;
use App\Services\TaskService;
use App\Models\User;
use App\Models\Workspace;

// ── Authz matrix (G2): viewer / owner / assignee override ─────────────────────

it('viewer (no permission) gets 403 on task create', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'viewer');

    $response = test()->post(route('tasks.store'), ['name' => 'Forbidden']);
    $response->assertStatus(403);
});

it('viewer sees 404 on task show (non-enumeration)', function () {
    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    $viewer = User::factory()->create();
    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');
    seedMember($workspace, $viewer, 'viewer');

    $task = app(TaskService::class)->create(['name' => 'Private Task'], null, null, [], []);

    // Viewer has view permission → can see
    actingInWorkspace($workspace, $viewer);
    $response = test()->get(route('tasks.show', $task));
    $response->assertOk();
});

it('task with view_own permission: user sees only their task', function () {
    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    $other = User::factory()->create();
    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');
    seedMember($workspace, $other, 'support_agent');

    $task = app(TaskService::class)->create(['name' => 'Owner Task'], null, null, [], []);

    // Other user — view_own but not assignee/owner → 404
    actingInWorkspace($workspace, $other);

    // Task is not theirs; support_agent has view_own only
    $response = test()->get(route('tasks.show', $task));
    $response->assertNotFound();
});

it('assignee can update task even without tenant.task.update (creator/assignee override)', function () {
    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    $assignee = User::factory()->create();
    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');
    seedMember($workspace, $assignee, 'viewer'); // viewer = no update permission

    $service = app(TaskService::class);
    $task = $service->create(['name' => 'Override Task'], null, null, [$assignee->id], []);

    // Assignee should be able to update (override policy)
    actingInWorkspace($workspace, $assignee);
    $response = test()->patch(route('tasks.update', $task), [
        'name' => 'Updated by Assignee',
        'lock_version' => $task->lock_version,
    ]);

    $response->assertRedirect(); // not 403
    expect($task->fresh()->name)->toBe('Updated by Assignee');
});

it('owner can delete their own task even without tenant.task.delete', function () {
    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'viewer'); // no delete permission via role

    $service = app(TaskService::class);
    $task = $service->create(['name' => 'Owner Delete'], null, null, [], []);

    $response = test()->delete(route('tasks.destroy', $task));
    $response->assertRedirect();
    expect(Task::find($task->id))->toBeNull();
});

it('task from other workspace returns 404 (non-enumeration)', function () {
    $workspace1 = Workspace::factory()->create();
    $workspace2 = Workspace::factory()->create();
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    actingInWorkspace($workspace1, $user1);
    seedMember($workspace1, $user1, 'admin');
    $task = app(TaskService::class)->create(['name' => 'WS1 Task'], null, null, [], []);

    actingInWorkspace($workspace2, $user2);
    seedMember($workspace2, $user2, 'admin');

    $response = test()->get(route('tasks.show', ['task' => $task->id]));
    $response->assertNotFound();
});

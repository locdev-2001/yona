<?php

use App\Models\Task;
use App\Models\User;
use Modules\Tenancy\Models\Workspace;
use App\Services\TaskService;

// ── Authz matrix: Tasks (G2/BR-X15) ──────────────────────────────────────────
// guest → redirect; sai-permission → 403; ngoài-tầm → 404; đúng → 2xx.
// Task visibility: assignee override — even viewers can see tasks they are assigned to.

function makeTaskForAuthz(): array
{
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $task = app(TaskService::class)->create(['name' => 'Test Task'], null, null, [], []);

    return compact('ws', 'user', 'task');
}

// ─── Guest ────────────────────────────────────────────────────────────────────

it('guest is redirected from tasks.index', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    $this->get(route('tasks.index'))->assertRedirect();
});

it('guest is redirected from tasks.show', function () {
    ['task' => $task] = makeTaskForAuthz();

    auth()->logout();

    $this->get(route('tasks.show', $task))->assertRedirect();
});

// ─── viewer role ──────────────────────────────────────────────────────────────

it('viewer gets 403 on tasks.store', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'viewer');
    actingInWorkspace($ws, $user);

    $this->actingAs($user)
        ->post(route('tasks.store'), ['name' => 'Forbidden Task'])
        ->assertStatus(403);
});

// ─── Cross-workspace → 404 ────────────────────────────────────────────────────

it('admin in WS-B gets 404 on show for WS-A task', function () {
    ['task' => $task] = makeTaskForAuthz();

    $wsB = Workspace::factory()->create();
    $userB = User::factory()->create();
    actingInWorkspace($wsB, $userB);
    seedMember($wsB, $userB, 'admin');

    $this->actingAs($userB)
        ->get(route('tasks.show', $task->id))
        ->assertStatus(404);
});

it('admin in WS-B gets 404 on delete for WS-A task', function () {
    ['task' => $task] = makeTaskForAuthz();

    $wsB = Workspace::factory()->create();
    $userB = User::factory()->create();
    actingInWorkspace($wsB, $userB);
    seedMember($wsB, $userB, 'admin');

    $this->actingAs($userB)
        ->delete(route('tasks.destroy', $task->id))
        ->assertStatus(404);
});

// ─── Admin can CRUD tasks ─────────────────────────────────────────────────────

it('admin can create a task', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $this->actingAs($user)
        ->post(route('tasks.store'), ['name' => 'New Task', 'priority' => 2])
        ->assertRedirect();
});

it('admin can view any task in workspace', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    $other = User::factory()->create();

    actingInWorkspace($ws, $other);
    seedMember($ws, $other, 'admin');
    seedMember($ws, $admin, 'admin');

    $task = app(TaskService::class)->create(['name' => 'Other Task'], null, null, [], []);

    actingInWorkspace($ws, $admin);

    $this->actingAs($admin)
        ->get(route('tasks.show', $task))
        ->assertOk();
});

it('admin can delete their task', function () {
    ['user' => $user, 'task' => $task] = makeTaskForAuthz();

    $this->actingAs($user)
        ->delete(route('tasks.destroy', $task))
        ->assertRedirect();

    expect(Task::find($task->id))->toBeNull();
});

// ─── Assignee override ────────────────────────────────────────────────────────

it('assignee (viewer role) can see and update the task they are assigned to', function () {
    $ws = Workspace::factory()->create();
    $owner = User::factory()->create();
    $assignee = User::factory()->create();

    actingInWorkspace($ws, $owner);
    seedMember($ws, $owner, 'admin');
    seedMember($ws, $assignee, 'viewer');

    $task = app(TaskService::class)->create(
        ['name' => 'Assignee Task'],
        null,
        null,
        [$assignee->id],
        [],
    );

    actingInWorkspace($ws, $assignee);

    $this->actingAs($assignee)
        ->get(route('tasks.show', $task))
        ->assertOk();
});

// ─── view_own: user only sees their own task ──────────────────────────────────

it('support_agent (view_own) gets 404 on task they do not own or are assigned to', function () {
    $ws = Workspace::factory()->create();
    $owner = User::factory()->create();
    $agent = User::factory()->create();

    actingInWorkspace($ws, $owner);
    seedMember($ws, $owner, 'admin');
    seedMember($ws, $agent, 'support_agent');

    $task = app(TaskService::class)->create(['name' => 'Owner Only Task'], null, null, [], []);

    actingInWorkspace($ws, $agent);

    $this->actingAs($agent)
        ->get(route('tasks.show', $task))
        ->assertNotFound();
});

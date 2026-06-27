<?php

use App\Models\Task;
use App\Models\User;
use Modules\Tenancy\Models\Workspace;
use App\Services\TaskService;
use App\Services\TaskTimerService;
use Illuminate\Support\Facades\DB;

// ── 2-workspace tenant isolation + RLS pivot coverage ─────────────────────────

it('task from workspace A is invisible in workspace B (Eloquent global scope)', function () {
    $ws1 = Workspace::factory()->create();
    $ws2 = Workspace::factory()->create();
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    actingInWorkspace($ws1, $user1);
    seedMember($ws1, $user1, 'admin');
    $task = app(TaskService::class)->create(['name' => 'WS1 Secret'], null, null, [], []);

    actingInWorkspace($ws2, $user2);
    seedMember($ws2, $user2, 'admin');

    $found = Task::where('id', $task->id)->first();
    expect($found)->toBeNull();
});

it('raw query on tasks respects RLS when context set to WS-B', function () {
    $ws1 = Workspace::factory()->create();
    $ws2 = Workspace::factory()->create();
    $user1 = User::factory()->create();

    actingInWorkspace($ws1, $user1);
    seedMember($ws1, $user1, 'admin');
    $task = app(TaskService::class)->create(['name' => 'RLS Test'], null, null, [], []);

    setWorkspaceContext($ws2->id);

    $count = DB::table('tasks')->where('id', $task->id)->count();
    expect($count)->toBe(0);
});

it('timer from workspace A is invisible via RLS when context set to WS-B', function () {
    $ws1 = Workspace::factory()->create();
    $ws2 = Workspace::factory()->create();
    $user1 = User::factory()->create();

    actingInWorkspace($ws1, $user1);
    seedMember($ws1, $user1, 'admin');

    $task = app(TaskService::class)->create(['name' => 'Timer Isolation'], null, null, [$user1->id], []);
    $timer = app(TaskTimerService::class)->start($task, $user1);

    setWorkspaceContext($ws2->id);

    $count = DB::table('task_timers')->where('id', $timer->id)->count();
    expect($count)->toBe(0);
});

it('task_assignees pivot (WS-A insert, WS-B context → 0 rows raw query) [G4]', function () {
    $ws1 = Workspace::factory()->create();
    $ws2 = Workspace::factory()->create();
    $user = User::factory()->create();

    actingInWorkspace($ws1, $user);
    seedMember($ws1, $user, 'admin');

    $task = app(TaskService::class)->create(['name' => 'Assignee RLS'], null, null, [$user->id], []);
    $assigneeRow = DB::table('task_assignees')->where('task_id', $task->id)->first();
    expect($assigneeRow)->not->toBeNull();

    // Switch context to WS-B — RLS should deny
    setWorkspaceContext($ws2->id);

    $count = DB::table('task_assignees')->where('task_id', $task->id)->count();
    expect($count)->toBe(0, 'task_assignees should be invisible under WS-B RLS context');
});

it('task_followers pivot RLS (WS-A insert, WS-B context → 0 rows) [G4]', function () {
    $ws1 = Workspace::factory()->create();
    $ws2 = Workspace::factory()->create();
    $user = User::factory()->create();

    actingInWorkspace($ws1, $user);
    seedMember($ws1, $user, 'admin');

    $task = app(TaskService::class)->create(['name' => 'Follower RLS'], null, null, [], []);

    // Insert follower directly (service syncFollowers)
    app(TaskService::class)->syncFollowers($task, [$user->id]);

    setWorkspaceContext($ws2->id);

    $count = DB::table('task_followers')->where('task_id', $task->id)->count();
    expect($count)->toBe(0, 'task_followers should be invisible under WS-B RLS context');
});

it('task_checklist_items pivot RLS (WS-A insert, WS-B context → 0 rows) [G4]', function () {
    $ws1 = Workspace::factory()->create();
    $ws2 = Workspace::factory()->create();
    $user = User::factory()->create();

    actingInWorkspace($ws1, $user);
    seedMember($ws1, $user, 'admin');

    $task = app(TaskService::class)->create(['name' => 'Checklist RLS'], null, null, [], []);
    $item = app(TaskService::class)->addChecklistItem($task, 'Item', null);

    setWorkspaceContext($ws2->id);

    $count = DB::table('task_checklist_items')->where('id', $item->id)->count();
    expect($count)->toBe(0, 'task_checklist_items should be invisible under WS-B RLS context');
});

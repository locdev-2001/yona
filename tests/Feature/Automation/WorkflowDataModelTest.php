<?php

use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowRun;
use App\Models\WorkflowRunLog;
use App\Models\Workspace;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Phase 01 — data model: RLS isolation + anti-double-enroll unique index.

it('workspace B cannot read workspace A workflows via eloquent', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'admin');

    actingInWorkspace($wsA, $userA);
    Workflow::factory()->create(['name' => 'WS-A workflow']);

    actingInWorkspace($wsB);
    expect(Workflow::count())->toBe(0);
});

it('workspace B cannot read workspace A workflows via raw SQL (RLS layer 3)', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'admin');

    actingInWorkspace($wsA, $userA);
    Workflow::factory()->create();

    setWorkspaceContext($wsB->id);
    $count = DB::table('workflows')->count();

    expect($count)->toBe(0, 'RLS must prevent WS-B from seeing WS-A workflows');
});

it('workspace B cannot read workspace A workflow runs via eloquent', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'admin');

    actingInWorkspace($wsA, $userA);
    $workflow = Workflow::factory()->create();
    WorkflowRun::create([
        'workflow_id' => $workflow->id,
        'subject_type' => 'lead',
        'subject_id' => (string) Str::uuid(),
        'status' => WorkflowRun::STATUS_RUNNING,
        'loop_count' => 0,
    ]);

    actingInWorkspace($wsB);
    expect(WorkflowRun::count())->toBe(0);
});

it('workspace B cannot read workspace A workflow runs via raw SQL (RLS layer 3)', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'admin');

    actingInWorkspace($wsA, $userA);
    $workflow = Workflow::factory()->create();
    WorkflowRun::create([
        'workflow_id' => $workflow->id,
        'subject_type' => 'lead',
        'subject_id' => (string) Str::uuid(),
        'status' => WorkflowRun::STATUS_RUNNING,
        'loop_count' => 0,
    ]);

    setWorkspaceContext($wsB->id);
    $count = DB::table('workflow_runs')->count();

    expect($count)->toBe(0, 'RLS must prevent WS-B from seeing WS-A workflow runs');
});

it('workspace B cannot read workspace A workflow run logs via eloquent', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'admin');

    actingInWorkspace($wsA, $userA);
    $workflow = Workflow::factory()->create();
    $run = WorkflowRun::create([
        'workflow_id' => $workflow->id,
        'subject_type' => 'lead',
        'subject_id' => (string) Str::uuid(),
        'status' => WorkflowRun::STATUS_RUNNING,
        'loop_count' => 0,
    ]);
    WorkflowRunLog::create([
        'workflow_run_id' => $run->id,
        'node_id' => 'condition-1',
        'node_type' => 'condition',
        'result' => WorkflowRunLog::RESULT_SUCCESS,
    ]);

    actingInWorkspace($wsB);
    expect(WorkflowRunLog::count())->toBe(0);
});

it('workspace B cannot read workspace A workflow run logs via raw SQL (RLS layer 3)', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'admin');

    actingInWorkspace($wsA, $userA);
    $workflow = Workflow::factory()->create();
    $run = WorkflowRun::create([
        'workflow_id' => $workflow->id,
        'subject_type' => 'lead',
        'subject_id' => (string) Str::uuid(),
        'status' => WorkflowRun::STATUS_RUNNING,
        'loop_count' => 0,
    ]);
    WorkflowRunLog::create([
        'workflow_run_id' => $run->id,
        'node_id' => 'condition-1',
        'node_type' => 'condition',
        'result' => WorkflowRunLog::RESULT_SUCCESS,
    ]);

    setWorkspaceContext($wsB->id);
    $count = DB::table('workflow_run_logs')->count();

    expect($count)->toBe(0, 'RLS must prevent WS-B from seeing WS-A workflow run logs');
});

it('rejects enrolling the same subject twice into a running workflow run', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $workflow = Workflow::factory()->create();
    $subjectId = (string) Str::uuid();

    WorkflowRun::create([
        'workflow_id' => $workflow->id,
        'subject_type' => 'lead',
        'subject_id' => $subjectId,
        'current_node_id' => 'node-1',
        'status' => WorkflowRun::STATUS_RUNNING,
        'loop_count' => 0,
    ]);

    expect(fn () => WorkflowRun::create([
        'workflow_id' => $workflow->id,
        'subject_type' => 'lead',
        'subject_id' => $subjectId,
        'current_node_id' => 'node-1',
        'status' => WorkflowRun::STATUS_RUNNING,
        'loop_count' => 0,
    ]))->toThrow(QueryException::class);
});

it('allows re-enrolling the same subject once the prior run is no longer running', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $workflow = Workflow::factory()->create();
    $subjectId = (string) Str::uuid();

    $first = WorkflowRun::create([
        'workflow_id' => $workflow->id,
        'subject_type' => 'lead',
        'subject_id' => $subjectId,
        'status' => WorkflowRun::STATUS_COMPLETED,
        'loop_count' => 0,
    ]);

    $second = WorkflowRun::create([
        'workflow_id' => $workflow->id,
        'subject_type' => 'lead',
        'subject_id' => $subjectId,
        'status' => WorkflowRun::STATUS_RUNNING,
        'loop_count' => 0,
    ]);

    expect($second->id)->not->toBe($first->id);
});

it('logs steps against a run in append-only fashion', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $workflow = Workflow::factory()->create();
    $run = WorkflowRun::create([
        'workflow_id' => $workflow->id,
        'subject_type' => 'lead',
        'subject_id' => (string) Str::uuid(),
        'status' => WorkflowRun::STATUS_RUNNING,
        'loop_count' => 0,
    ]);

    WorkflowRunLog::create([
        'workflow_run_id' => $run->id,
        'node_id' => 'condition-1',
        'node_type' => 'condition',
        'result' => WorkflowRunLog::RESULT_SUCCESS,
    ]);

    expect($run->logs()->count())->toBe(1);
});

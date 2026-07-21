<?php

use App\Console\Commands\ResumeWaitingWorkflowRuns;
use App\Jobs\AdvanceWorkflowRunJob;
use App\Models\Lead;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowRun;
use App\Models\WorkflowRunLog;
use App\Models\Workspace;
use App\Modules\Automation\WorkflowEngine;
use Illuminate\Support\Facades\Bus;

// Phase 02 — WorkflowEngine core: graph walk, loop cap, dedup, resume.
//
// QUEUE_CONNECTION=sync in testing (phpunit.xml) — AdvanceWorkflowRunJob
// executes immediately, inline, on dispatch(). WorkflowEngine::advance()
// walks the WHOLE synchronous segment (from current position to the next
// wait/end/failed) in one call — it never dispatches a new job mid-walk
// (see WorkflowEngine's docblock: doing so would self-deadlock against
// ShouldBeUnique's lock, discovered while writing these tests).
//
// AdvanceWorkflowRunJob resets the RLS/currentWorkspace context in a
// `finally` block once it finishes (G12 isolation protocol — required so a
// long-lived queue worker never leaks one run's workspace into the next
// job it processes). Under a REAL async queue this is invisible to callers
// (the job runs in a separate process). Under the `sync` driver used here,
// the job runs inline and its `finally` wipes whatever ambient workspace
// context the TEST itself had bound — so every call that triggers a
// dispatch (enroll(), resumeRun()) must be followed by re-binding
// actingInWorkspace() before the test queries anything else. Same
// interaction is already documented + handled the same way in
// tests/Feature/Reminders/ReminderSchedulerTest.php ("Clear context before
// running scheduler (simulates CLI environment)").
//
// resumeDue() is called directly with an explicit $dueRuns list rather than
// via `Artisan::call('workflow:resume-waiting')` with no args: the no-arg
// path queries via the `pgsql_privileged` connection, which — under Postgres
// READ COMMITTED — cannot see this test's own uncommitted transaction on the
// default connection. Same constraint already documented on
// ReminderService::dispatchDue(); the production (no-arg) path relies on
// that same, already-proven pattern.

function conditionAlwaysTrueOnLeadId(Lead $lead): array
{
    return [
        'field' => 'id',
        'operator' => 'equals',
        'value' => (string) $lead->id,
    ];
}

function resumeRun(WorkflowRun $run): void
{
    app(ResumeWaitingWorkflowRuns::class)->dispatchDue([
        ['id' => $run->id, 'workspace_id' => $run->workspace_id],
    ]);
}

it('runs start→condition(true)→wait→end to completion across a resume tick', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $lead = Lead::factory()->create();

    $workflow = Workflow::factory()->create(['is_active' => true, 'graph' => [
        'nodes' => [
            ['id' => 'n_start', 'type' => 'start', 'config' => []],
            ['id' => 'n_cond', 'type' => 'condition', 'config' => ['conditions' => [conditionAlwaysTrueOnLeadId($lead)]]],
            ['id' => 'n_wait', 'type' => 'wait', 'config' => ['amount' => 5, 'unit' => 'minutes']],
            ['id' => 'n_end', 'type' => 'end', 'config' => []],
        ],
        'edges' => [
            ['from' => 'n_start', 'to' => 'n_cond', 'branch' => null],
            ['from' => 'n_cond', 'to' => 'n_wait', 'branch' => true],
            ['from' => 'n_cond', 'to' => 'n_end', 'branch' => false],
            ['from' => 'n_wait', 'to' => 'n_end', 'branch' => null],
        ],
    ]]);

    $run = app(WorkflowEngine::class)->enroll($workflow, 'lead', $lead->id);
    actingInWorkspace($ws, $user);
    $run->refresh();

    expect($run->current_node_id)->toBe('n_wait');
    expect($run->status)->toBe(WorkflowRun::STATUS_WAITING);
    expect($run->resume_at)->not->toBeNull();

    test()->travel(6)->minutes();
    resumeRun($run);
    actingInWorkspace($ws, $user);

    $run->refresh();
    expect($run->status)->toBe(WorkflowRun::STATUS_COMPLETED);
    expect($run->current_node_id)->toBe('n_end');
});

it('condition node routes a deleted subject down the false branch, never the true one', function () {
    // Regression: skipped() used to leave `branch` null, so the engine's
    // edge lookup (branch filter is a no-op when null) picked whichever
    // edge was declared FIRST in the graph regardless of its branch flag —
    // a deleted subject could silently take the "true" action path.
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $lead = Lead::factory()->create();
    $leadId = $lead->id;

    // "true" edge declared first on purpose — proves the fix isn't an
    // accident of edge-array ordering.
    $workflow = Workflow::factory()->create(['graph' => [
        'nodes' => [
            ['id' => 'n_start', 'type' => 'start', 'config' => []],
            ['id' => 'n_cond', 'type' => 'condition', 'config' => ['conditions' => [conditionAlwaysTrueOnLeadId($lead)]]],
            ['id' => 'n_true_end', 'type' => 'end', 'config' => []],
            ['id' => 'n_false_end', 'type' => 'end', 'config' => []],
        ],
        'edges' => [
            ['from' => 'n_start', 'to' => 'n_cond', 'branch' => null],
            ['from' => 'n_cond', 'to' => 'n_true_end', 'branch' => true],
            ['from' => 'n_cond', 'to' => 'n_false_end', 'branch' => false],
        ],
    ]]);

    $lead->delete();

    $run = app(WorkflowEngine::class)->enroll($workflow, 'lead', $leadId);
    actingInWorkspace($ws, $user);
    $run->refresh();

    expect($run->status)->toBe(WorkflowRun::STATUS_COMPLETED);
    expect($run->current_node_id)->toBe('n_false_end');
});

it('enroll never persists current_node_id at the start node, and start is never handled', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $lead = Lead::factory()->create();

    $workflow = Workflow::factory()->create(['graph' => [
        'nodes' => [
            ['id' => 'n_start', 'type' => 'start', 'config' => []],
            ['id' => 'n_cond', 'type' => 'condition', 'config' => ['conditions' => [conditionAlwaysTrueOnLeadId($lead)]]],
            ['id' => 'n_end', 'type' => 'end', 'config' => []],
        ],
        'edges' => [
            ['from' => 'n_start', 'to' => 'n_cond', 'branch' => null],
            ['from' => 'n_cond', 'to' => 'n_end', 'branch' => true],
            ['from' => 'n_cond', 'to' => 'n_end', 'branch' => false],
        ],
    ]]);

    $run = app(WorkflowEngine::class)->enroll($workflow, 'lead', $lead->id);
    actingInWorkspace($ws, $user);
    $run->refresh();

    expect($run->current_node_id)->not->toBe('n_start');
    expect(WorkflowRunLog::where('workflow_run_id', $run->id)->where('node_type', 'start')->count())->toBe(0);
});

it('caps a cyclic graph at the 5th revisit of a node and fails', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $lead = Lead::factory()->create();

    // start → cond(always true) → wait → cond (cycle back) ; cond(false) → end (unreachable here)
    $workflow = Workflow::factory()->create(['graph' => [
        'nodes' => [
            ['id' => 'n_start', 'type' => 'start', 'config' => []],
            ['id' => 'n_cond', 'type' => 'condition', 'config' => ['conditions' => [conditionAlwaysTrueOnLeadId($lead)]]],
            ['id' => 'n_wait', 'type' => 'wait', 'config' => ['amount' => 1, 'unit' => 'minutes']],
            ['id' => 'n_end', 'type' => 'end', 'config' => []],
        ],
        'edges' => [
            ['from' => 'n_start', 'to' => 'n_cond', 'branch' => null],
            ['from' => 'n_cond', 'to' => 'n_wait', 'branch' => true],
            ['from' => 'n_cond', 'to' => 'n_end', 'branch' => false],
            ['from' => 'n_wait', 'to' => 'n_cond', 'branch' => null],
        ],
    ]]);

    $run = app(WorkflowEngine::class)->enroll($workflow, 'lead', $lead->id);
    actingInWorkspace($ws, $user);

    // 5 resume ticks: each drives one more cond→wait cycle.
    for ($i = 0; $i < 5; $i++) {
        test()->travel(2)->minutes();
        resumeRun($run);
        actingInWorkspace($ws, $user);
    }

    $run->refresh();
    expect($run->status)->toBe(WorkflowRun::STATUS_FAILED);

    $failedLog = WorkflowRunLog::where('workflow_run_id', $run->id)
        ->where('result', WorkflowRunLog::RESULT_FAILED)
        ->latest('created_at')
        ->first();
    expect($failedLog->message)->toBe('loop_count_exceeded');
});

it('completes a long straight-line journey through 6 distinct wait nodes without tripping the loop cap', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $lead = Lead::factory()->create();

    $nodes = [['id' => 'n_start', 'type' => 'start', 'config' => []]];
    $edges = [];
    $prev = 'n_start';

    for ($i = 1; $i <= 6; $i++) {
        $nodeId = "n_wait_{$i}";
        $nodes[] = ['id' => $nodeId, 'type' => 'wait', 'config' => ['amount' => 1, 'unit' => 'minutes']];
        $edges[] = ['from' => $prev, 'to' => $nodeId, 'branch' => null];
        $prev = $nodeId;
    }
    $nodes[] = ['id' => 'n_end', 'type' => 'end', 'config' => []];
    $edges[] = ['from' => $prev, 'to' => 'n_end', 'branch' => null];

    $workflow = Workflow::factory()->create(['graph' => ['nodes' => $nodes, 'edges' => $edges]]);

    $run = app(WorkflowEngine::class)->enroll($workflow, 'lead', $lead->id);
    actingInWorkspace($ws, $user);

    for ($i = 0; $i < 6; $i++) {
        test()->travel(2)->minutes();
        resumeRun($run);
        actingInWorkspace($ws, $user);
    }

    $run->refresh();
    expect($run->status)->toBe(WorkflowRun::STATUS_COMPLETED);
    expect($run->loop_count)->toBeLessThan(2);
});

it('AdvanceWorkflowRunJob implements the ShouldBeUnique contract keyed on workflow_run_id', function () {
    // Laravel's ShouldBeUnique lock mechanism itself is framework-guaranteed;
    // this test verifies OUR contract wiring (uniqueId returns the run id,
    // not the workspace id or a composite), not the lock's internal behavior
    // (vendor internals are out of scope for this repo's tests).
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $lead = Lead::factory()->create();
    $workflow = Workflow::factory()->create(['graph' => [
        'nodes' => [
            ['id' => 'n_start', 'type' => 'start', 'config' => []],
            ['id' => 'n_end', 'type' => 'end', 'config' => []],
        ],
        'edges' => [
            ['from' => 'n_start', 'to' => 'n_end', 'branch' => null],
        ],
    ]]);

    Bus::fake([AdvanceWorkflowRunJob::class]);

    $run = app(WorkflowEngine::class)->enroll($workflow, 'lead', $lead->id);
    $job = new AdvanceWorkflowRunJob($run->workspace_id, $run->id);

    expect($job)->toBeInstanceOf(Illuminate\Contracts\Queue\ShouldBeUnique::class);
    expect($job->uniqueId())->toBe($run->id);

    AdvanceWorkflowRunJob::dispatch($run->workspace_id, $run->id);
    Bus::assertDispatched(AdvanceWorkflowRunJob::class, fn ($dispatched) => $dispatched->workflowRunId === $run->id);
});

it('resumeDue only advances runs it was given', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $workflow = Workflow::factory()->create(['graph' => [
        'nodes' => [
            ['id' => 'n_start', 'type' => 'start', 'config' => []],
            ['id' => 'n_wait', 'type' => 'wait', 'config' => ['amount' => 30, 'unit' => 'minutes']],
            ['id' => 'n_end', 'type' => 'end', 'config' => []],
        ],
        'edges' => [
            ['from' => 'n_start', 'to' => 'n_wait', 'branch' => null],
            ['from' => 'n_wait', 'to' => 'n_end', 'branch' => null],
        ],
    ]]);

    $dueSoonLead = Lead::factory()->create();
    $notDueLead = Lead::factory()->state(['lead_number' => 1])->create();

    $dueRun = app(WorkflowEngine::class)->enroll($workflow, 'lead', $dueSoonLead->id);
    actingInWorkspace($ws, $user);
    $notDueRun = app(WorkflowEngine::class)->enroll($workflow, 'lead', $notDueLead->id);
    actingInWorkspace($ws, $user);

    test()->travel(31)->minutes();

    // Only pass the "due" run — proves resumeDue() only acts on what it's
    // given, mirroring how the production query filters resume_at <= now().
    resumeRun($dueRun);
    actingInWorkspace($ws, $user);

    $dueRun->refresh();
    $notDueRun->refresh();

    expect($dueRun->status)->toBe(WorkflowRun::STATUS_COMPLETED);
    expect($notDueRun->status)->toBe(WorkflowRun::STATUS_WAITING);
});

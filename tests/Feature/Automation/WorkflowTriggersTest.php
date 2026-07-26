<?php

use App\Events\LeadCreated;
use App\Jobs\DebounceMessageReceivedTriggerJob;
use App\Models\Conversation;
use App\Models\Lead;
use App\Models\Message;
use App\Models\PipelineStage;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowRun;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Services\EntitlementService;
use App\Services\GrantPlanService;
use App\Services\LeadService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Phase 04 — Entry layer: EvaluateWorkflowTriggers listener + the
// scalar-only jobs it dispatches (EnrollWorkflowsForLeadEventJob,
// DebounceMessageReceivedTriggerJob), WorkflowController graph validation.
// (Phase 05's permission/entitlement gates are covered separately in
// WorkflowPermissionsTest.php — every test here grants module.marketing so
// it's testing trigger/validation behavior, not re-proving the gate.)
//
// QUEUE_CONNECTION=sync (phpunit.xml) — jobs execute immediately, inline, on
// dispatch(). This test suite runs against a real, non-transactional-wrapped
// test DB (no RefreshDatabase/DatabaseTransactions trait in tests/TestCase.php),
// so a genuine commit/rollback distinction exists at the DB level.
//
// Honest scope note: the "rolls back → 0 enrollments" / "commits → 1
// enrollment" tests below prove ENROLLMENT CORRECTNESS under commit/rollback,
// but do NOT by themselves distinguish ShouldQueueAfterCommit from a naive
// ShouldQueue dispatch — everything here runs on one connection/process, so
// the specific cross-connection RLS race that ShouldQueueAfterCommit guards
// against (a queue WORKER in a separate process reading the Lead before the
// producer's transaction commits) can't be reproduced by an in-process test.
// The guarantee itself is a documented, code-reviewed design decision (see
// EnrollWorkflowsForLeadEventJob's docblock), not something re-proven here.

function startTriggerGraph(string $trigger): array
{
    return [
        'nodes' => [
            ['id' => 'n_start', 'type' => 'start', 'config' => ['trigger' => $trigger]],
            ['id' => 'n_end', 'type' => 'end', 'config' => []],
        ],
        'edges' => [
            ['from' => 'n_start', 'to' => 'n_end', 'branch' => null],
        ],
    ];
}

/**
 * Grants module.marketing to $ws — every trigger/controller test needs this
 * now that Phase 05 gates both the write path (entitled:module.marketing
 * route middleware) and the trigger path
 * (WorkflowEngine::enrollActiveWorkflowsForTrigger()).
 *
 * The MarketplaceItem is created via the pgsql_privileged connection
 * directly, NOT Eloquent's default connection — tests/Pest.php applies
 * Laravel's DatabaseTransactions trait globally, which wraps only the
 * DEFAULT connection in an uncommitted (rolled-back-at-teardown)
 * transaction. GrantPlanService::grant() reads the item via the default
 * connection but INSERTs workspace_purchases via pgsql_privileged — a row
 * created via the default connection is invisible to pgsql_privileged
 * until the outer test transaction resolves (never, until rollback), so
 * grant()'s FK insert fails. A row created via pgsql_privileged (a real,
 * immediately-committing connection) IS visible to the default connection
 * too (proven: not wrapped by DatabaseTransactions), so creating it there
 * satisfies both of grant()'s own connections.
 */
function grantMarketingEntitlement(Workspace $ws): void
{
    $privileged = DB::connection('pgsql_privileged');

    $exists = $privileged->table('marketplace_items')->where('code', 'module-marketing')->exists();

    if (! $exists) {
        $privileged->table('marketplace_items')->insert([
            'id' => (string) Str::uuid(),
            'code' => 'module-marketing',
            'name' => 'Marketing module',
            'type' => 'feature_module',
            'billing_type' => 'subscription',
            'price_cents' => 0,
            'currency' => 'VND',
            'is_active' => true,
            'entitlements' => json_encode(['flags' => ['module.marketing'], 'quotas' => []]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    app(GrantPlanService::class)->grant($ws->id, 'module-marketing');
    app(EntitlementService::class)->forgetCache($ws->id);
}

it('LeadCreated does not enroll anything if the surrounding transaction rolls back', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);
    grantMarketingEntitlement($ws);

    Workflow::factory()->create(['is_active' => true, 'graph' => startTriggerGraph('lead_created')]);

    $leadId = null;

    try {
        DB::transaction(function () use (&$leadId) {
            $lead = Lead::factory()->create();
            $leadId = $lead->id;
            event(new LeadCreated($lead));

            throw new RuntimeException('simulated failure after LeadCreated fires');
        });
    } catch (RuntimeException) {
        // expected
    }

    expect(Lead::find($leadId))->toBeNull();
    expect(WorkflowRun::where('subject_type', 'lead')->where('subject_id', $leadId)->count())->toBe(0);
});

it('LeadCreated enrolls a matching active workflow after a real commit, and only that one', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);
    grantMarketingEntitlement($ws);

    Workflow::factory()->create(['is_active' => true, 'graph' => startTriggerGraph('lead_created')]);
    Workflow::factory()->create(['is_active' => true, 'graph' => startTriggerGraph('lead_assigned')]); // must NOT match
    Workflow::factory()->create(['is_active' => false, 'graph' => startTriggerGraph('lead_created')]); // inactive, must NOT match

    $lead = null;

    DB::transaction(function () use (&$lead) {
        $lead = Lead::factory()->create();
        event(new LeadCreated($lead));
    });

    actingInWorkspace($ws, $user);

    expect(WorkflowRun::where('subject_type', 'lead')->where('subject_id', $lead->id)->count())->toBe(1);
});

it('LeadAssigned enrolls a matching active workflow exactly once', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);
    grantMarketingEntitlement($ws);

    Workflow::factory()->create(['is_active' => true, 'graph' => startTriggerGraph('lead_assigned')]);
    Workflow::factory()->create(['is_active' => true, 'graph' => startTriggerGraph('lead_created')]); // must NOT match

    $lead = Lead::factory()->create();
    app(LeadService::class)->assign($lead, $user->id);
    actingInWorkspace($ws, $user);

    expect(WorkflowRun::where('subject_type', 'lead')->where('subject_id', $lead->id)->count())->toBe(1);
});

it('LeadStageChanged (fired inside LeadService::moveStage()\'s own transaction) enrolls exactly once', function () {
    // Real regression coverage for the reason EnrollWorkflowsForLeadEventJob
    // exists: LeadStageChanged fires inside DB::transaction()
    // (LeadService::moveStage(), app/Services/LeadService.php:131-158) —
    // this drives that exact code path, not a hand-rolled event() call.
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);
    grantMarketingEntitlement($ws);

    Workflow::factory()->create(['is_active' => true, 'graph' => startTriggerGraph('lead_stage_changed')]);

    $lead = Lead::factory()->create();
    $targetStage = PipelineStage::factory()->create([
        'pipeline_id' => $lead->pipeline_id,
        'stage_order' => 1,
    ]);

    app(LeadService::class)->moveStage($lead, $targetStage->id, 0);
    actingInWorkspace($ws, $user);

    expect(WorkflowRun::where('subject_type', 'lead')->where('subject_id', $lead->id)->count())->toBe(1);
});

it('debounces rapid-fire MessageReceived: only the latest message triggers enrollment', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);
    grantMarketingEntitlement($ws);

    Workflow::factory()->create(['is_active' => true, 'graph' => startTriggerGraph('message_received')]);

    $conversation = Conversation::create([
        'workspace_id' => $ws->id,
        'channel' => 'zalo_personal',
        'sender_uid' => 'peer-'.Str::uuid(),
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $ws->id),
    ]);

    // Simulate 3 rapid-fire inbound messages, each with its own debounce job
    // scheduled at dispatch time. By the time delayed jobs actually run in
    // production (~8s later), all 3 messages already exist — reproduce that
    // by creating all 3 messages FIRST, then running each job (sync queue
    // executes immediately, so this models "jobs run after all 3 arrived").
    //
    // Eloquent's auto-timestamping overwrites created_at with the real "now"
    // at save() regardless of what's passed to create() — force distinct
    // timestamps via a raw update afterward so the 3 messages are actually
    // 1 second apart, not all stamped within the same real-time instant.
    $messages = collect(range(1, 3))->map(function ($i) use ($ws, $conversation) {
        $message = Message::create([
            'workspace_id' => $ws->id,
            'conversation_id' => $conversation->id,
            'direction' => 'in',
            'body' => "message {$i}",
            'source_id' => "src-{$i}",
        ]);
        $timestamp = now()->addSeconds($i);
        DB::table('messages')->where('id', $message->id)->update(['created_at' => $timestamp]);
        $message->created_at = $timestamp;

        return $message;
    });

    foreach ($messages as $message) {
        DebounceMessageReceivedTriggerJob::dispatch(
            $ws->id,
            $conversation->id,
            $message->created_at->toISOString(),
        );
        actingInWorkspace($ws, $user);
    }

    expect(WorkflowRun::where('subject_type', 'conversation')->where('subject_id', $conversation->id)->count())->toBe(1);
});

it('WorkflowController::store rejects a graph edge referencing a non-existent node id', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);
    grantMarketingEntitlement($ws);

    $response = $this->post(route('automation.workflows.store'), [
        'name' => 'Bad graph',
        'graph' => [
            'nodes' => [
                ['id' => 'n_start', 'type' => 'start', 'config' => []],
                ['id' => 'n_end', 'type' => 'end', 'config' => []],
            ],
            'edges' => [
                ['from' => 'n_start', 'to' => 'n_does_not_exist', 'branch' => null],
            ],
        ],
    ]);

    $response->assertSessionHasErrors('graph.edges.0.to');
    expect(Workflow::where('name', 'Bad graph')->exists())->toBeFalse();
});

it('WorkflowController::store rejects a start node with an incoming edge', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);
    grantMarketingEntitlement($ws);

    $response = $this->post(route('automation.workflows.store'), [
        'name' => 'Start has predecessor',
        'graph' => [
            'nodes' => [
                ['id' => 'n_start', 'type' => 'start', 'config' => []],
                ['id' => 'n_end', 'type' => 'end', 'config' => []],
            ],
            'edges' => [
                ['from' => 'n_start', 'to' => 'n_end', 'branch' => null],
                ['from' => 'n_end', 'to' => 'n_start', 'branch' => null],
            ],
        ],
    ]);

    $response->assertSessionHasErrors('graph.edges.1.to');
    expect(Workflow::where('name', 'Start has predecessor')->exists())->toBeFalse();
});

it('WorkflowController::store accepts a valid graph', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);
    grantMarketingEntitlement($ws);

    $response = $this->post(route('automation.workflows.store'), [
        'name' => 'Valid workflow',
        'graph' => startTriggerGraph('lead_created'),
    ]);

    $response->assertSessionHasNoErrors();
    expect(Workflow::where('name', 'Valid workflow')->exists())->toBeTrue();
});

it('manual-enroll endpoint enrolls the given subject synchronously', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);
    grantMarketingEntitlement($ws);

    $lead = Lead::factory()->create();
    $workflow = Workflow::factory()->create(['is_active' => true, 'graph' => startTriggerGraph('manual')]);

    $response = $this->post(route('automation.workflows.enroll', $workflow), [
        'subject_type' => 'lead',
        'subject_id' => $lead->id,
    ]);
    actingInWorkspace($ws, $user);

    $response->assertSessionHasNoErrors();
    expect(WorkflowRun::where('workflow_id', $workflow->id)->where('subject_id', $lead->id)->count())->toBe(1);
});

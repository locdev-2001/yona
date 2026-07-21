<?php

use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\User;
use App\Models\Workflow;
use App\Models\Workspace;
use App\Services\EntitlementService;
use App\Services\GrantPlanService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Phase 06 — canvas editor pages. Only route/prop wiring is covered here
// (WorkflowController::create()/formOptions()); the canvas itself is a
// frontend concern with no Pest coverage in this repo's stack.

// Same pgsql_privileged workaround documented in WorkflowTriggersTest.php /
// WorkflowPermissionsTest.php — required only for the store() test below,
// which goes through the entitled:module.marketing route middleware.
function grantMarketingEntitlement3(Workspace $ws): void
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

it('GET automation.workflows.create is forbidden without tenant.automation.manage', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'viewer');
    actingInWorkspace($ws, $user);

    $this->get(route('automation.workflows.create'))->assertForbidden();
});

it('GET automation.workflows.index is forbidden without tenant.automation.manage', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'viewer');
    actingInWorkspace($ws, $user);

    $this->get(route('automation.workflows.index'))->assertForbidden();
});

it('GET automation.workflows.show is forbidden without tenant.automation.manage', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'viewer');
    actingInWorkspace($ws, $user);

    $workflow = Workflow::factory()->create();

    $this->get(route('automation.workflows.show', $workflow))->assertForbidden();
});

it('store() persists each node\'s canvas position into the graph jsonb column', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);
    grantMarketingEntitlement3($ws);

    $this->post(route('automation.workflows.store'), [
        'name' => 'Positioned workflow',
        'graph' => [
            'nodes' => [
                ['id' => 'n_start', 'type' => 'start', 'config' => [], 'position' => ['x' => 250, 'y' => 40]],
                ['id' => 'n_end', 'type' => 'end', 'config' => [], 'position' => ['x' => 250, 'y' => 200]],
            ],
            'edges' => [
                ['from' => 'n_start', 'to' => 'n_end', 'branch' => null],
            ],
        ],
    ])->assertSessionHasNoErrors();

    $workflow = Workflow::where('name', 'Positioned workflow')->firstOrFail();

    expect($workflow->graph['nodes'][0]['position'])->toBe(['x' => 250, 'y' => 40]);
    expect($workflow->graph['nodes'][1]['position'])->toBe(['x' => 250, 'y' => 200]);
});

it('store() rejects a node type outside the v1 registry', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);
    grantMarketingEntitlement3($ws);

    $response = $this->post(route('automation.workflows.store'), [
        'name' => 'Bad node type',
        'graph' => [
            'nodes' => [
                ['id' => 'n_start', 'type' => 'start', 'config' => []],
                ['id' => 'n_bogus', 'type' => 'not_a_real_type', 'config' => []],
            ],
            'edges' => [
                ['from' => 'n_start', 'to' => 'n_bogus', 'branch' => null],
            ],
        ],
    ]);

    $response->assertSessionHasErrors('graph.nodes.1.type');
    expect(Workflow::where('name', 'Bad node type')->exists())->toBeFalse();
});

it('GET automation.workflows.create renders with pipelines+stages and members for an authorized user', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $pipeline = Pipeline::factory()->create();
    PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $this->get(route('automation.workflows.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('automation/create')
            ->has('pipelines', 1)
            ->has('pipelines.0.stages', 1)
            ->has('members', 1));
});

it('GET automation.workflows.show also exposes pipelines and members for the inspector panel', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $workflow = Workflow::factory()->create();

    $this->get(route('automation.workflows.show', $workflow))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('automation/show')
            ->where('workflow.id', $workflow->id)
            ->has('pipelines')
            ->has('members'));
});

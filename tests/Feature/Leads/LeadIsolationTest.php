<?php

use App\Models\Lead;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Services\LeadService;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Workspace;

// ── 2-workspace isolation ─────────────────────────────────────────────────────

it('lead from workspace A is not visible in workspace B query (RLS)', function () {
    $workspace1 = Workspace::factory()->create();
    $workspace2 = Workspace::factory()->create();
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    // Create lead in WS-1
    actingInWorkspace($workspace1, $user1);
    seedMember($workspace1, $user1, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $service = app(LeadService::class);
    $lead = $service->create(['name' => 'WS1 Secret', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage->id]);

    // Switch to WS-2
    actingInWorkspace($workspace2, $user2);
    seedMember($workspace2, $user2, 'admin');

    // Eloquent query should return 0 (global scope + RLS)
    $found = Lead::where('id', $lead->id)->first();
    expect($found)->toBeNull();
});

it('raw query on leads respects RLS when workspace context set to B', function () {
    $workspace1 = Workspace::factory()->create();
    $workspace2 = Workspace::factory()->create();
    $user1 = User::factory()->create();

    actingInWorkspace($workspace1, $user1);
    seedMember($workspace1, $user1, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $service = app(LeadService::class);
    $lead = $service->create(['name' => 'WS1 RLS Test', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage->id]);

    // Set RLS context to WS-2
    setWorkspaceContext($workspace2->id);

    $count = DB::table('leads')->where('id', $lead->id)->count();
    expect($count)->toBe(0);
});

it('lead count per workspace is isolated', function () {
    $workspace1 = Workspace::factory()->create();
    $workspace2 = Workspace::factory()->create();
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    actingInWorkspace($workspace1, $user1);
    seedMember($workspace1, $user1, 'admin');

    $pipeline1 = Pipeline::factory()->create();
    $stage1 = PipelineStage::factory()->for($pipeline1)->create(['workspace_id' => $pipeline1->workspace_id]);

    $service = app(LeadService::class);
    $service->create(['name' => 'WS1 Lead 1', 'pipeline_id' => $pipeline1->id, 'stage_id' => $stage1->id]);
    $service->create(['name' => 'WS1 Lead 2', 'pipeline_id' => $pipeline1->id, 'stage_id' => $stage1->id]);

    actingInWorkspace($workspace2, $user2);
    seedMember($workspace2, $user2, 'admin');

    // WS-2 should see 0 leads
    expect(Lead::count())->toBe(0);
});

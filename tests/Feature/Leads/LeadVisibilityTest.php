<?php

use App\Models\Lead;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;
use App\Services\LeadService;

// ── G12 Visibility matrix ─────────────────────────────────────────────────────

it('user with tenant.lead.view sees all workspace leads', function () {
    $workspace = Workspace::factory()->create();
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();
    actingInWorkspace($workspace, $user1);
    seedMember($workspace, $user1, 'admin');  // admin has tenant.lead.view
    seedMember($workspace, $user2, 'sales_rep');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $service = app(LeadService::class);

    // Lead owned by user2, not public
    actingInWorkspace($workspace, $user2);
    $lead = $service->create(['name' => 'User2 Lead', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage->id]);

    // Admin (user1) should see it
    actingInWorkspace($workspace, $user1);
    $visible = Lead::visibleTo($user1)->where('id', $lead->id)->exists();
    expect($visible)->toBeTrue();
});

it('user with only view_own cannot see another user lead', function () {
    $workspace = Workspace::factory()->create();
    $viewer = User::factory()->create();
    $owner = User::factory()->create();

    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $service = app(LeadService::class);
    $lead = $service->create(['name' => 'Owner Lead', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage->id]);

    // Viewer has view_own but is not assigned/owner
    actingInWorkspace($workspace, $viewer);
    seedMember($workspace, $viewer, 'sales_rep');

    $visible = Lead::visibleTo($viewer)->where('id', $lead->id)->exists();
    expect($visible)->toBeFalse();
});

it('is_public lead is visible to any workspace member', function () {
    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    $viewer = User::factory()->create();

    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');
    seedMember($workspace, $viewer, 'sales_rep');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $service = app(LeadService::class);
    $lead = $service->create([
        'name' => 'Public Lead',
        'pipeline_id' => $pipeline->id,
        'stage_id' => $stage->id,
        'is_public' => true,
    ]);

    actingInWorkspace($workspace, $viewer);
    $visible = Lead::visibleTo($viewer)->where('id', $lead->id)->exists();
    expect($visible)->toBeTrue();
});

it('accessing foreign workspace lead via route returns 404', function () {
    $workspace1 = Workspace::factory()->create();
    $workspace2 = Workspace::factory()->create();
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    actingInWorkspace($workspace1, $user1);
    seedMember($workspace1, $user1, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $service = app(LeadService::class);
    $lead = $service->create(['name' => 'WS1 Lead', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage->id]);

    // Now act as user2 in workspace2
    actingInWorkspace($workspace2, $user2);
    seedMember($workspace2, $user2, 'admin');

    $response = test()->get(route('leads.show', $lead->id));
    $response->assertStatus(404);
});

it('guest gets 401 on leads index', function () {
    test()->get(route('leads.index'))->assertRedirect(route('login'));
});

<?php

use App\Models\Lead;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\User;
use App\Models\Workspace;
use App\Services\LeadService;

// ── LeadService create / update / delete ─────────────────────────────────────

it('creates a lead via service and sets lead_number from sequence', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $service = app(LeadService::class);

    $lead = $service->create([
        'name' => 'Test Lead',
        'pipeline_id' => $pipeline->id,
        'stage_id' => $stage->id,
    ]);

    expect($lead->id)->not->toBeNull();
    expect($lead->lead_number)->toBe(1);
    expect($lead->name)->toBe('Test Lead');
    expect($lead->workspace_id)->toBe($workspace->id);
    expect($lead->owner_id)->toBe($user->id);
});

it('increments lead_number sequentially per workspace', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $service = app(LeadService::class);

    $lead1 = $service->create(['name' => 'Lead 1', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage->id]);
    $lead2 = $service->create(['name' => 'Lead 2', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage->id]);

    expect($lead1->lead_number)->toBe(1);
    expect($lead2->lead_number)->toBe(2);
});

it('updates a lead via service', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $service = app(LeadService::class);
    $lead = $service->create(['name' => 'Old Name', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage->id]);

    $service->update($lead, ['name' => 'New Name']);

    expect($lead->fresh()->name)->toBe('New Name');
});

it('soft-deletes a lead via route', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $service = app(LeadService::class);
    $lead = $service->create(['name' => 'To Delete', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage->id]);
    $leadId = $lead->id;

    $response = test()->delete(route('leads.destroy', $lead));

    $response->assertRedirect(route('leads.index'));
    expect(Lead::find($leadId))->toBeNull();
    expect(Lead::withTrashed()->find($leadId))->not->toBeNull();
});

it('creates lead via store route', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $response = test()->post(route('leads.store'), [
        'name' => 'Route Lead',
        'pipeline_id' => $pipeline->id,
        'stage_id' => $stage->id,
    ]);

    $response->assertRedirect();
    expect(Lead::where('name', 'Route Lead')->exists())->toBeTrue();
});

<?php

use Modules\CrmSales\Models\Pipeline;
use Modules\CrmSales\Models\PipelineStage;
use Modules\CrmSales\Services\LeadService;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;

// ── Lost / Junk / Restore ─────────────────────────────────────────────────────

it('markLost saves last_stage_id and sets is_lost', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage1 = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $service = app(LeadService::class);
    $lead = $service->create(['name' => 'Lost Lead', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage1->id]);

    $service->markLost($lead);

    $fresh = $lead->fresh();
    expect($fresh->is_lost)->toBeTrue();
    expect($fresh->last_stage_id)->toBe($stage1->id);
});

it('markJunk saves last_stage_id and sets is_junk', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $service = app(LeadService::class);
    $lead = $service->create(['name' => 'Junk Lead', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage->id]);

    $service->markJunk($lead);

    $fresh = $lead->fresh();
    expect($fresh->is_junk)->toBeTrue();
    expect($fresh->last_stage_id)->toBe($stage->id);
});

it('restore clears is_lost and returns to last_stage_id', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage1 = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);
    $stage2 = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $service = app(LeadService::class);
    $lead = $service->create(['name' => 'Restore Lead', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage1->id]);

    // Move to stage2, then mark lost
    $service->moveStage($lead, $stage2->id, 0);
    $service->markLost($lead);

    expect($lead->fresh()->is_lost)->toBeTrue();
    expect($lead->fresh()->last_stage_id)->toBe($stage2->id);

    // Restore
    $service->restore($lead);

    $fresh = $lead->fresh();
    expect($fresh->is_lost)->toBeFalse();
    expect($fresh->is_junk)->toBeFalse();
    expect($fresh->stage_id)->toBe($stage2->id);
    expect($fresh->last_stage_id)->toBeNull();
});

it('restore clears is_junk flag', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $service = app(LeadService::class);
    $lead = $service->create(['name' => 'Junk Restore', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage->id]);
    $service->markJunk($lead);
    $service->restore($lead);

    $fresh = $lead->fresh();
    expect($fresh->is_junk)->toBeFalse();
    expect($fresh->last_stage_id)->toBeNull();
});

<?php

use App\Events\LeadStageChanged;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Services\LeadService;
use Illuminate\Support\Facades\Event;
use Illuminate\Validation\ValidationException;
use App\Models\User;
use App\Models\Activity;
use App\Models\Workspace;

// ── G8 Pipeline invariant + kanban stage move ─────────────────────────────────

it('moves stage and logs activity + fires LeadStageChanged event', function () {
    Event::fake([LeadStageChanged::class]);

    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage1 = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id, 'stage_order' => 1]);
    $stage2 = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id, 'stage_order' => 2]);

    $service = app(LeadService::class);
    $lead = $service->create(['name' => 'Move Me', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage1->id]);

    $service->moveStage($lead, $stage2->id, 0);

    expect($lead->fresh()->stage_id)->toBe($stage2->id);

    // Activity logged
    $activity = Activity::where('subject_id', $lead->id)
        ->where('action', 'lead.stage_changed')
        ->first();
    expect($activity)->not->toBeNull();
    expect($activity->payload['from_stage_id'])->toBe($stage1->id);
    expect($activity->payload['to_stage_id'])->toBe($stage2->id);

    Event::assertDispatched(LeadStageChanged::class, fn ($e) => $e->lead->id === $lead->id && $e->previousStageId === $stage1->id);
});

it('rejects stage from different pipeline with 422', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline1 = Pipeline::factory()->create();
    $stage1 = PipelineStage::factory()->for($pipeline1)->create(['workspace_id' => $pipeline1->workspace_id]);

    $pipeline2 = Pipeline::factory()->create();
    $stage2 = PipelineStage::factory()->for($pipeline2)->create(['workspace_id' => $pipeline2->workspace_id]);

    $service = app(LeadService::class);
    $lead = $service->create(['name' => 'Cross Test', 'pipeline_id' => $pipeline1->id, 'stage_id' => $stage1->id]);

    // Attempt to move to stage from pipeline2 → should fail
    expect(fn () => $service->moveStage($lead, $stage2->id, 0))
        ->toThrow(ValidationException::class);
});

it('rejects stage move via route when stage not in lead pipeline', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline1 = Pipeline::factory()->create();
    $stage1 = PipelineStage::factory()->for($pipeline1)->create(['workspace_id' => $pipeline1->workspace_id]);

    $pipeline2 = Pipeline::factory()->create();
    $stage2 = PipelineStage::factory()->for($pipeline2)->create(['workspace_id' => $pipeline2->workspace_id]);

    $service = app(LeadService::class);
    $lead = $service->create(['name' => 'Route Cross', 'pipeline_id' => $pipeline1->id, 'stage_id' => $stage1->id]);

    $response = test()->patch(route('leads.stage', $lead->id), [
        'stage_id' => $stage2->id,
        'order' => 0,
    ]);

    // Inertia FormRequest validation → redirect back with session errors
    $response->assertSessionHasErrors(['stage_id']);
});

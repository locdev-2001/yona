<?php

use App\Events\LeadAssigned;
use App\Models\Activity;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\User;
use App\Models\Workspace;
use App\Notifications\LeadAssignedNotification;
use App\Services\LeadService;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;

// ── Assignment notification + activity ───────────────────────────────────────

it('assigns lead, logs activity and fires LeadAssigned event', function () {
    Event::fake([LeadAssigned::class]);

    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    $assignee = User::factory()->create();
    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');
    seedMember($workspace, $assignee, 'sales_rep');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $service = app(LeadService::class);
    $lead = $service->create(['name' => 'Assign Test', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage->id]);

    $service->assign($lead, $assignee->id);

    expect($lead->fresh()->assigned_to)->toBe($assignee->id);

    $activity = Activity::where('subject_id', $lead->id)
        ->where('action', 'lead.assigned')
        ->first();
    expect($activity)->not->toBeNull();
    expect($activity->payload['to_user_id'])->toBe($assignee->id);

    Event::assertDispatched(LeadAssigned::class, fn ($e) => $e->lead->id === $lead->id);
});

it('sends DB notification to assignee when assigned via service', function () {
    Notification::fake();

    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    $assignee = User::factory()->create();
    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');
    seedMember($workspace, $assignee, 'sales_rep');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $service = app(LeadService::class);
    $lead = $service->create([
        'name' => 'Notif Test',
        'pipeline_id' => $pipeline->id,
        'stage_id' => $stage->id,
        'assigned_to' => $assignee->id,
    ]);

    Notification::assertSentTo($assignee, LeadAssignedNotification::class);
});

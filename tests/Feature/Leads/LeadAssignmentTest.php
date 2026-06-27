<?php

use Modules\CrmSales\Events\LeadAssigned;
use Modules\CrmSales\Models\Pipeline;
use Modules\CrmSales\Models\PipelineStage;
use Modules\CrmSales\Notifications\LeadAssignedNotification;
use Modules\CrmSales\Services\LeadService;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Modules\Identity\Models\User;
use Modules\Shared\Models\Activity;
use Modules\Tenancy\Models\Workspace;

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

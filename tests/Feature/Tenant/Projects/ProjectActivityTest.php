<?php

use Modules\CrmSales\Models\Client;
use App\Models\ProjectStatus;
use App\Services\ProjectService;
use Modules\Identity\Models\User;
use Modules\Shared\Models\Activity;
use Modules\Tenancy\Models\Workspace;

// P08 — Activity logging for project mutations.

it('logs project_created activity on creation', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Activity Test', 'client_id' => $client->id], $user->id);

    $activity = Activity::where('subject_type', 'project')
        ->where('subject_id', $project->id)
        ->where('action', 'project_created')
        ->first();

    expect($activity)->not->toBeNull();
    expect($activity->payload['name'])->toBe('Activity Test');
});

it('logs project_member_added activity on addMember', function () {
    $workspace = Workspace::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();

    actingInWorkspace($workspace, $admin);
    seedMember($workspace, $admin, 'admin');
    seedMember($workspace, $member, 'sales_rep');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Activity Member', 'client_id' => $client->id], $admin->id);

    app(ProjectService::class)->addMember($project, $member->id);

    $activity = Activity::where('subject_type', 'project')
        ->where('subject_id', $project->id)
        ->where('action', 'project_member_added')
        ->first();

    expect($activity)->not->toBeNull();
    expect($activity->payload['user_id'])->toBe($member->id);
});

it('logs project_status_changed activity on changeStatus', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Status Activity', 'client_id' => $client->id], $user->id);

    $newStatus = ProjectStatus::factory()->create(['name' => 'In Progress']);
    app(ProjectService::class)->changeStatus($project, $newStatus->id);

    $activity = Activity::where('subject_type', 'project')
        ->where('subject_id', $project->id)
        ->where('action', 'project_status_changed')
        ->first();

    expect($activity)->not->toBeNull();
    expect($activity->payload['to_status_name'])->toBe('In Progress');
});

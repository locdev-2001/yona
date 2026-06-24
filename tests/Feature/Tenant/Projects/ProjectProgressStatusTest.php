<?php

use App\Models\Client;
use App\Models\ProjectStatus;
use App\Models\User;
use App\Models\Workspace;
use App\Services\ProjectService;

// P08 — Progress + status transitions.

it('recalcProgressFromTasks returns safely when tasks table does not exist', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Recalc Test', 'client_id' => $client->id], $user->id);

    // Guard: tasks table doesn't exist yet (P09 not merged) → no exception
    // We just call and expect no throw
    $result = app(ProjectService::class)->recalcProgressFromTasks($project);

    expect($result->id)->toBe($project->id);
});

it('changeStatus to non-finished clears finished_at', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Unfinish Test', 'client_id' => $client->id], $user->id);

    $finishedStatus = ProjectStatus::factory()->create(['name' => 'Finished']);
    $openStatus = ProjectStatus::factory()->create(['name' => 'Open']);

    app(ProjectService::class)->changeStatus($project, $finishedStatus->id);
    expect($project->fresh()->finished_at)->not->toBeNull();

    app(ProjectService::class)->changeStatus($project->fresh(), $openStatus->id);
    expect($project->fresh()->finished_at)->toBeNull();
});

it('setProgress does not allow negative values (clamped to 0)', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Clamp Test', 'client_id' => $client->id], $user->id);

    app(ProjectService::class)->setProgress($project, -50);
    expect($project->fresh()->progress)->toBe(0);
});

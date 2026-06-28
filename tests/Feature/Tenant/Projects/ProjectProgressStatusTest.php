<?php

use App\Models\Client;
use App\Models\ProjectStatus;
use App\Services\ProjectService;
use App\Models\User;
use App\Models\Workspace;

// P08 — Progress + status transitions.

it('recalcProgressFromTasks returns zero progress when project has no tasks', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Recalc Test', 'client_id' => $client->id], $user->id);

    // P09 merged: tasks table exists, project has no tasks → progress = 0, no throw
    $result = app(ProjectService::class)->recalcProgressFromTasks($project);

    expect($result->id)->toBe($project->id);
    expect($result->progress)->toBe(0);
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

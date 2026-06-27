<?php

use App\Models\Client;
use App\Models\ProjectMilestone;
use App\Services\ProjectMilestoneService;
use App\Services\ProjectService;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;

// P08 — Milestone CRUD + reorder.

it('creates a milestone within a project', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Milestone Project', 'client_id' => $client->id], $user->id);

    $milestone = app(ProjectMilestoneService::class)->create($project, [
        'name' => 'Phase 1',
        'color' => '#6366f1',
        'due_date' => '2026-12-31',
    ]);

    expect($milestone->id)->not->toBeNull();
    expect($milestone->project_id)->toBe($project->id);
    expect($milestone->workspace_id)->toBe($workspace->id);
    expect($milestone->name)->toBe('Phase 1');
});

it('assigns sequential milestone_order on creation', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Order Project', 'client_id' => $client->id], $user->id);
    $service = app(ProjectMilestoneService::class);

    $m1 = $service->create($project, ['name' => 'M1']);
    $m2 = $service->create($project, ['name' => 'M2']);

    expect($m2->milestone_order)->toBeGreaterThan($m1->milestone_order);
});

it('reorders milestones by ordered_ids', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Reorder', 'client_id' => $client->id], $user->id);
    $service = app(ProjectMilestoneService::class);

    $m1 = $service->create($project, ['name' => 'A']);
    $m2 = $service->create($project, ['name' => 'B']);
    $m3 = $service->create($project, ['name' => 'C']);

    // Reverse order: C, A, B
    $service->reorder($project, [$m3->id, $m1->id, $m2->id]);

    $m3->refresh();
    $m1->refresh();
    $m2->refresh();

    expect($m3->milestone_order)->toBe(0);
    expect($m1->milestone_order)->toBe(1);
    expect($m2->milestone_order)->toBe(2);
});

it('soft-deletes a milestone', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Delete Milestone', 'client_id' => $client->id], $user->id);
    $milestone = app(ProjectMilestoneService::class)->create($project, ['name' => 'To Delete']);

    app(ProjectMilestoneService::class)->delete($milestone);

    expect(ProjectMilestone::find($milestone->id))->toBeNull();
    expect(ProjectMilestone::withTrashed()->find($milestone->id))->not->toBeNull();
});

<?php

use App\Models\Client;
use App\Models\Project;
use App\Models\ProjectStatus;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;
use App\Services\ProjectService;

// P08 — ProjectCrudTest: create / update / delete via service.

it('creates a project with workspace sequence number', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $status = ProjectStatus::factory()->create();
    $client = Client::factory()->create();

    $project = app(ProjectService::class)->create([
        'name' => 'Test Project Alpha',
        'client_id' => $client->id,
        'billing_type' => Project::BILLING_FIXED,
    ], $user->id);

    expect($project->id)->not->toBeNull();
    expect($project->project_number)->toBeGreaterThan(0);
    expect($project->name)->toBe('Test Project Alpha');
    expect($project->owner_id)->toBe($user->id);
    expect($project->workspace_id)->toBe($workspace->id);
});

it('increments project_number per workspace', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $service = app(ProjectService::class);

    $p1 = $service->create(['name' => 'Project 1', 'client_id' => $client->id], $user->id);
    $p2 = $service->create(['name' => 'Project 2', 'client_id' => $client->id], $user->id);

    expect($p2->project_number)->toBe($p1->project_number + 1);
});

it('updates project fields', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Old Name', 'client_id' => $client->id], $user->id);

    app(ProjectService::class)->update($project, ['name' => 'New Name', 'description' => 'Updated']);

    $project->refresh();
    expect($project->name)->toBe('New Name');
    expect($project->description)->toBe('Updated');
});

it('soft-deletes a project', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'To Delete', 'client_id' => $client->id], $user->id);

    app(ProjectService::class)->delete($project);

    expect(Project::find($project->id))->toBeNull();
    expect(Project::withTrashed()->find($project->id))->not->toBeNull();
});

it('changes project status and sets finished_at when finished', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $finishedStatus = ProjectStatus::factory()->create(['name' => 'Finished']);
    $project = app(ProjectService::class)->create(['name' => 'Status Test', 'client_id' => $client->id], $user->id);

    app(ProjectService::class)->changeStatus($project, $finishedStatus->id);

    $project->refresh();
    expect($project->status_id)->toBe($finishedStatus->id);
    expect($project->finished_at)->not->toBeNull();
    expect($project->progress)->toBe(100);
});

it('sets progress manually and clamps to 0-100', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Progress Test', 'client_id' => $client->id], $user->id);

    app(ProjectService::class)->setProgress($project, 150); // clamp to 100

    $project->refresh();
    expect($project->progress)->toBe(100);
});

it('toggles pin flag', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Pin Test', 'client_id' => $client->id], $user->id);
    $project->refresh(); // Reload to apply DB defaults (is_pinned default false)

    expect($project->is_pinned)->toBeFalse();

    app(ProjectService::class)->togglePin($project);
    $project->refresh();
    expect($project->is_pinned)->toBeTrue();

    app(ProjectService::class)->togglePin($project);
    $project->refresh();
    expect($project->is_pinned)->toBeFalse();
});

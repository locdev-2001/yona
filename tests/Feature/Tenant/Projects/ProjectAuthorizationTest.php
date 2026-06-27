<?php

use App\Models\Client;
use App\Policies\ProjectPolicy;
use App\Services\ProjectService;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;

// P08 — Authz matrix: 401 guest / 403 missing permission / 404 foreign WS / 200 authorized.

it('guest is redirected when accessing projects index (401)', function () {
    $workspace = Workspace::factory()->create();
    setWorkspaceContext($workspace->id);

    $this->get(route('projects.index'))->assertRedirect(route('login'));
});

it('ProjectPolicy::viewAny returns false for user with no project permissions', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    // Do NOT seedMember so user has no spatie permissions at all

    $policy = new ProjectPolicy;
    expect($policy->viewAny($user))->toBeFalse();
});

it('user with tenant.project.view can list projects (200)', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $this->get(route('projects.index'))->assertOk();
});

it('accessing a project from another workspace returns 404', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    actingInWorkspace($wsA, $userA);
    seedMember($wsA, $userA, 'admin');
    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'WS-A', 'client_id' => $client->id], $userA->id);

    clearWorkspaceContext();
    actingInWorkspace($wsB, $userB);
    seedMember($wsB, $userB, 'admin');

    $this->get(route('projects.show', $project->id))->assertNotFound();
});

it('user with create permission can access create page', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $this->get(route('projects.create'))->assertOk();
});

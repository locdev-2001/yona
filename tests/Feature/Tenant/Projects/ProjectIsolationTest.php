<?php

use App\Models\Client;
use App\Models\Project;
use App\Services\ProjectService;
use Illuminate\Support\Facades\DB;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;

// P08 — Tenant isolation: workspace A project invisible in workspace B context.

it('projects from workspace A are invisible in workspace B', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    // Create project in WS-A
    actingInWorkspace($wsA, $userA);
    seedMember($wsA, $userA, 'admin');
    $client = Client::factory()->create();
    app(ProjectService::class)->create(['name' => 'WS-A Project', 'client_id' => $client->id], $userA->id);

    clearWorkspaceContext();

    // Switch to WS-B — project count must be 0
    actingInWorkspace($wsB, $userB);
    seedMember($wsB, $userB, 'admin');

    expect(Project::count())->toBe(0);
});

it('route-model-binding for project from other workspace returns 404', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    // Create project in WS-A
    actingInWorkspace($wsA, $userA);
    seedMember($wsA, $userA, 'admin');
    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'WS-A Project', 'client_id' => $client->id], $userA->id);

    clearWorkspaceContext();

    // User B tries to access project from WS-A via HTTP
    actingInWorkspace($wsB, $userB);
    seedMember($wsB, $userB, 'admin');

    $this->get(route('projects.show', $project->id))->assertNotFound();
});

it('RLS prevents raw query from leaking cross-workspace projects', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $userA = User::factory()->create();

    actingInWorkspace($wsA, $userA);
    seedMember($wsA, $userA, 'admin');
    $client = Client::factory()->create();
    app(ProjectService::class)->create(['name' => 'Secret Project', 'client_id' => $client->id], $userA->id);

    clearWorkspaceContext();
    setWorkspaceContext($wsB->id);

    $count = DB::table('projects')->count();
    expect($count)->toBe(0);
});

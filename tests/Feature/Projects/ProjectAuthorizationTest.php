<?php

use App\Models\Client;
use App\Models\Project;
use App\Services\ProjectService;
use App\Models\User;
use App\Models\Workspace;

// ── Authz matrix: Projects (G2/BR-X15) ───────────────────────────────────────
// guest → redirect; sai-permission → 403; ngoài-tầm → 404; đúng → 2xx.

function makeProjectForAuthz(): array
{
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $client = Client::factory()->create(['workspace_id' => $ws->id]);
    $project = app(ProjectService::class)->create([
        'name' => 'Test Project',
        'client_id' => $client->id,
    ]);

    return compact('ws', 'user', 'project', 'client');
}

// ─── Guest ────────────────────────────────────────────────────────────────────

it('guest is redirected from projects.index', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    $this->get(route('projects.index'))->assertRedirect();
});

it('guest is redirected from projects.show', function () {
    ['project' => $project] = makeProjectForAuthz();

    auth()->logout();

    $this->get(route('projects.show', $project))->assertRedirect();
});

// ─── viewer role (no create/update/delete) ────────────────────────────────────

it('viewer gets 403 on projects.store', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'viewer');
    actingInWorkspace($ws, $user);

    $this->actingAs($user)
        ->post(route('projects.store'), ['name' => 'Forbidden Project'])
        ->assertStatus(403);
});

// ─── Cross-workspace → 404 ────────────────────────────────────────────────────

it('admin in WS-B gets 404 on show for WS-A project', function () {
    ['ws' => $wsA, 'project' => $project] = makeProjectForAuthz();

    $wsB = Workspace::factory()->create();
    $userB = User::factory()->create();
    actingInWorkspace($wsB, $userB);
    seedMember($wsB, $userB, 'admin');

    $this->actingAs($userB)
        ->get(route('projects.show', $project->id))
        ->assertStatus(404);
});

it('admin in WS-B gets 404 on delete for WS-A project', function () {
    ['project' => $project] = makeProjectForAuthz();

    $wsB = Workspace::factory()->create();
    $userB = User::factory()->create();
    actingInWorkspace($wsB, $userB);
    seedMember($wsB, $userB, 'admin');

    $this->actingAs($userB)
        ->delete(route('projects.destroy', $project->id))
        ->assertStatus(404);
});

// ─── Admin (all) sees any project ────────────────────────────────────────────

it('admin can view any project in their workspace', function () {
    $ws = Workspace::factory()->create();
    $creator = User::factory()->create();
    $admin = User::factory()->create();

    actingInWorkspace($ws, $creator);
    seedMember($ws, $creator, 'admin');
    seedMember($ws, $admin, 'admin');

    $client = Client::factory()->create(['workspace_id' => $ws->id]);
    $project = app(ProjectService::class)->create([
        'name' => 'Shared Project',
        'client_id' => $client->id,
    ]);

    actingInWorkspace($ws, $admin);

    $this->actingAs($admin)
        ->get(route('projects.show', $project))
        ->assertOk();
});

// ─── Admin can CRUD projects ──────────────────────────────────────────────────

it('admin can create a project', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $this->actingAs($user)
        ->post(route('projects.store'), ['name' => 'New Project'])
        ->assertRedirect();
});

it('admin can delete their project', function () {
    ['user' => $user, 'project' => $project] = makeProjectForAuthz();

    $this->actingAs($user)
        ->delete(route('projects.destroy', $project))
        ->assertRedirect();

    expect(Project::find($project->id))->toBeNull();
});

it('admin can update their project', function () {
    ['user' => $user, 'project' => $project] = makeProjectForAuthz();

    $this->actingAs($user)
        ->patch(route('projects.update', $project), [
            'name' => 'Updated Project',
            'lock_version' => $project->lock_version,
        ])
        ->assertRedirect();

    expect($project->fresh()->name)->toBe('Updated Project');
});

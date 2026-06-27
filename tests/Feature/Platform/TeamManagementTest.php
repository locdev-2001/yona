<?php

use Modules\Identity\Models\Team;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;
use Modules\Identity\Services\TeamService;

// Settings → Teams CRUD (admin, cycle-guarded, workspace-scoped). BR-X02/X13/X15.

function teamAdmin(Workspace $workspace): User
{
    $user = User::factory()->create();
    seedMember($workspace, $user, 'admin');

    return $user;
}

it('lets an admin view the teams page', function () {
    $ws = Workspace::factory()->create();

    $this->actingAs(teamAdmin($ws))->get('/settings/teams')->assertOk();
});

it('creates a root team', function () {
    $ws = Workspace::factory()->create();

    $this->actingAs(teamAdmin($ws))
        ->from('/settings/teams')
        ->post('/settings/teams', ['name' => 'Sales'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    actingInWorkspace($ws);
    expect(Team::where('name', 'Sales')->exists())->toBeTrue();
});

it('creates a child team under a parent', function () {
    $ws = Workspace::factory()->create();
    $admin = teamAdmin($ws);
    actingInWorkspace($ws);
    $root = app(TeamService::class)->create('Root');

    $this->actingAs($admin)
        ->post('/settings/teams', ['name' => 'Child', 'parent_id' => $root->id])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    actingInWorkspace($ws);
    expect(Team::where('name', 'Child')->first()->parent_id)->toBe($root->id);
});

it('renames a team', function () {
    $ws = Workspace::factory()->create();
    $admin = teamAdmin($ws);
    actingInWorkspace($ws);
    $team = app(TeamService::class)->create('Old');

    $this->actingAs($admin)
        ->patch(route('teams.update', $team->id), ['name' => 'New'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($team->fresh()->name)->toBe('New');
});

it('rejects a reparent that would create a cycle', function () {
    $ws = Workspace::factory()->create();
    $admin = teamAdmin($ws);
    actingInWorkspace($ws);
    $svc = app(TeamService::class);
    $root = $svc->create('Root');
    $child = $svc->create('Child', $root->id);

    $this->actingAs($admin)
        ->from('/settings/teams')
        ->patch(route('teams.reparent', $root->id), ['parent_id' => $child->id])
        ->assertSessionHasErrors('parent_id');
});

it('soft-deletes a team', function () {
    $ws = Workspace::factory()->create();
    $admin = teamAdmin($ws);
    actingInWorkspace($ws);
    $team = app(TeamService::class)->create('Doomed');

    $this->actingAs($admin)->delete(route('teams.destroy', $team->id))->assertRedirect();

    expect(Team::withTrashed()->find($team->id)->trashed())->toBeTrue();
});

it('forbids a non-admin from managing teams', function () {
    $ws = Workspace::factory()->create();
    $viewer = User::factory()->create();
    seedMember($ws, $viewer, 'viewer');

    $this->actingAs($viewer)->get('/settings/teams')->assertForbidden();
    $this->actingAs($viewer)->post('/settings/teams', ['name' => 'X'])->assertForbidden();
});

it('returns 404 for a team in another workspace', function () {
    $own = Workspace::factory()->create();
    $admin = teamAdmin($own);

    $other = Workspace::factory()->create();
    actingInWorkspace($other);
    $foreign = app(TeamService::class)->create('Foreign');
    clearWorkspaceContext();

    $this->actingAs($admin)->patch(route('teams.update', $foreign->id), ['name' => 'x'])->assertNotFound();
});

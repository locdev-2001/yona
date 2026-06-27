<?php

use App\Models\Team;
use App\Models\User;
use Modules\Tenancy\Models\Workspace;
use Modules\Tenancy\Models\WorkspaceMember;
use App\Services\TeamService;
use Spatie\Permission\PermissionRegistrar;

// Settings → Members: invite / role / team (server-controlled, BR-X12/X03/X15).

it('lets an admin view the members page', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    $this->actingAs($admin)->get('/settings/members')->assertOk();
});

it('invites a new member with a role and team and syncs the spatie role', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');
    actingInWorkspace($ws);
    $team = app(TeamService::class)->create('Sales');

    $this->actingAs($admin)
        ->from('/settings/members')
        ->post('/settings/members', ['email' => 'new@example.com', 'role' => 'sales_rep', 'team_id' => $team->id])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    actingInWorkspace($ws);
    $invited = User::where('email', 'new@example.com')->first();
    $member = WorkspaceMember::where('user_id', $invited->id)->first();

    expect($member->role)->toBe('sales_rep')
        ->and($member->team_id)->toBe($team->id)
        ->and($member->status)->toBe('invited');

    app(PermissionRegistrar::class)->setPermissionsTeamId($ws->id);
    expect($invited->fresh()->hasRole('sales_rep'))->toBeTrue();
});

it('updates a member role and team', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');
    $target = User::factory()->create();
    $member = seedMember($ws, $target, 'sales_rep');

    $this->actingAs($admin)
        ->patch(route('members.update', $member->id), ['role' => 'sales_manager', 'team_id' => null])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($member->fresh()->role)->toBe('sales_manager');

    app(PermissionRegistrar::class)->setPermissionsTeamId($ws->id);
    expect($target->fresh()->hasRole('sales_manager'))->toBeTrue()
        ->and($target->fresh()->hasRole('sales_rep'))->toBeFalse();
});

it('blocks an admin from changing their own role (anti self-escalation)', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    $ownMembership = seedMember($ws, $admin, 'admin');

    $this->actingAs($admin)
        ->patch(route('members.update', $ownMembership->id), ['role' => 'viewer', 'team_id' => null])
        ->assertForbidden();

    expect($ownMembership->fresh()->role)->toBe('admin');
});

it('deactivates a member', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');
    $member = seedMember($ws, User::factory()->create(), 'sales_rep');

    $this->actingAs($admin)->delete(route('members.destroy', $member->id))->assertRedirect();

    expect($member->fresh()->status)->toBe('deactivated');
});

it('forbids a non-admin from managing members', function () {
    $ws = Workspace::factory()->create();
    $viewer = User::factory()->create();
    seedMember($ws, $viewer, 'viewer');

    $this->actingAs($viewer)->get('/settings/members')->assertForbidden();
    $this->actingAs($viewer)->post('/settings/members', ['email' => 'x@example.com', 'role' => 'viewer'])->assertForbidden();
});

it('returns 404 for a member in another workspace', function () {
    $own = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($own, $admin, 'admin');

    $other = Workspace::factory()->create();
    $foreignMember = seedMember($other, User::factory()->create(), 'sales_rep');
    clearWorkspaceContext();

    $this->actingAs($admin)
        ->patch(route('members.update', $foreignMember->id), ['role' => 'viewer', 'team_id' => null])
        ->assertNotFound();
});

it('rejects an invalid role', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    $this->actingAs($admin)
        ->from('/settings/members')
        ->post('/settings/members', ['email' => 'x@example.com', 'role' => 'superuser'])
        ->assertSessionHasErrors('role');
});

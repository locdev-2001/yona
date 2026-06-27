<?php

use Modules\CrmSales\Models\Client;
use Modules\Projects\Services\ProjectService;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;

// P08 — G12: Member management — active workspace_member validation.

it('can add an active workspace member to a project', function () {
    $workspace = Workspace::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();

    actingInWorkspace($workspace, $admin);
    seedMember($workspace, $admin, 'admin');
    seedMember($workspace, $member, 'sales_rep');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Member Test', 'client_id' => $client->id], $admin->id);

    app(ProjectService::class)->addMember($project, $member->id);

    expect($project->members()->where('users.id', $member->id)->exists())->toBeTrue();
});

it('rejects adding a user who is not a workspace member (G12)', function () {
    $workspace = Workspace::factory()->create();
    $admin = User::factory()->create();
    $outsider = User::factory()->create(); // no seedMember

    actingInWorkspace($workspace, $admin);
    seedMember($workspace, $admin, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Gate Test', 'client_id' => $client->id], $admin->id);

    expect(fn () => app(ProjectService::class)->addMember($project, $outsider->id))
        ->toThrow(RuntimeException::class);
});

it('can remove a member from a project', function () {
    $workspace = Workspace::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();

    actingInWorkspace($workspace, $admin);
    seedMember($workspace, $admin, 'admin');
    seedMember($workspace, $member, 'sales_rep');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Remove Test', 'client_id' => $client->id], $admin->id);

    app(ProjectService::class)->addMember($project, $member->id);
    expect($project->members()->where('users.id', $member->id)->exists())->toBeTrue();

    app(ProjectService::class)->removeMember($project, $member->id);
    expect($project->fresh()->members()->where('users.id', $member->id)->exists())->toBeFalse();
});

it('add-member endpoint requires manageMembers gate (403 without update permission)', function () {
    $workspace = Workspace::factory()->create();
    $viewer = User::factory()->create();
    $memberUser = User::factory()->create();

    actingInWorkspace($workspace, $viewer);
    seedMember($workspace, $viewer, 'viewer');
    seedMember($workspace, $memberUser, 'sales_rep');
    $viewer->revokePermissionTo('tenant.project.update');

    $admin = User::factory()->create();
    actingInWorkspace($workspace, $admin);
    seedMember($workspace, $admin, 'admin');
    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Gate 403', 'client_id' => $client->id], $admin->id);

    clearWorkspaceContext();
    actingInWorkspace($workspace, $viewer);

    $this->post(route('projects.members.store', $project->id), ['user_id' => $memberUser->id])
        ->assertForbidden();
});

it('addMember is idempotent (no duplicate pivot row)', function () {
    $workspace = Workspace::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();

    actingInWorkspace($workspace, $admin);
    seedMember($workspace, $admin, 'admin');
    seedMember($workspace, $member, 'sales_rep');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Idempotent', 'client_id' => $client->id], $admin->id);

    $service = app(ProjectService::class);
    $service->addMember($project, $member->id);
    $service->addMember($project, $member->id); // second call — no exception

    expect($project->members()->where('users.id', $member->id)->count())->toBe(1);
});

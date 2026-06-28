<?php

use Illuminate\Support\Facades\Gate;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;

// Feature gate (spatie, scoped per workspace) + Policies (BR-X02/X12).

it('scopes roles per workspace — the same user differs across workspaces', function () {
    $user = User::factory()->create();
    $w1 = Workspace::factory()->create();
    $w2 = Workspace::factory()->create();

    seedMember($w1, $user, 'admin');
    seedMember($w2, $user, 'viewer');

    actingInWorkspace($w1, $user);
    expect($user->fresh()->can('tenant.team.manage'))->toBeTrue()
        ->and($user->fresh()->can('tenant.member.manage'))->toBeTrue();

    actingInWorkspace($w2, $user);
    expect($user->fresh()->can('tenant.team.manage'))->toBeFalse()
        ->and($user->fresh()->can('tenant.workspace.update'))->toBeFalse();
});

it('lets an admin pass management policies and blocks a viewer', function () {
    $w = Workspace::factory()->create();
    $admin = User::factory()->create();
    $viewer = User::factory()->create();

    seedMember($w, $admin, 'admin');
    seedMember($w, $viewer, 'viewer');

    actingInWorkspace($w, $admin);
    expect(Gate::forUser($admin->fresh())->allows('update', $w))->toBeTrue()
        ->and(Gate::forUser($admin->fresh())->allows('create', Team::class))->toBeTrue();

    actingInWorkspace($w, $viewer);
    expect(Gate::forUser($viewer->fresh())->allows('update', $w))->toBeFalse()
        ->and(Gate::forUser($viewer->fresh())->allows('create', Team::class))->toBeFalse();
});

it('grants tenant.audit.view to managers but not reps', function () {
    $w = Workspace::factory()->create();
    $manager = User::factory()->create();
    $rep = User::factory()->create();

    seedMember($w, $manager, 'sales_manager');
    seedMember($w, $rep, 'sales_rep');

    actingInWorkspace($w, $manager);
    expect($manager->fresh()->can('tenant.audit.view'))->toBeTrue();

    actingInWorkspace($w, $rep);
    expect($rep->fresh()->can('tenant.audit.view'))->toBeFalse();
});

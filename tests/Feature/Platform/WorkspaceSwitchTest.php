<?php

use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;
use Inertia\Testing\AssertableInertia as Assert;

// Server-controlled active workspace + switching (BR-X14) + shared props.

it('switches to a workspace the user belongs to', function () {
    $user = User::factory()->create();
    $w1 = Workspace::factory()->create();
    $w2 = Workspace::factory()->create();
    seedMember($w1, $user, 'admin');
    seedMember($w2, $user, 'sales_rep');

    $this->actingAs($user)
        ->post(route('workspaces.switch', $w2->id))
        ->assertRedirect();

    expect(session('current_workspace_id'))->toBe($w2->id);
});

it('forbids switching to a workspace the user does not belong to', function () {
    $user = User::factory()->create();
    $own = Workspace::factory()->create();
    $foreign = Workspace::factory()->create();
    seedMember($own, $user, 'admin');

    $this->actingAs($user)
        ->post(route('workspaces.switch', $foreign->id))
        ->assertForbidden();
});

it('exposes the active workspace + membership role to the page', function () {
    $user = $this->createWorkspaceUser('admin');

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('auth.workspaces', 1)
            ->where('auth.membership.role', 'admin')
            ->has('auth.membership.permissions')
            ->has('activeWorkspace')
        );
});

it('lists all of the user active workspaces for the switcher', function () {
    $user = User::factory()->create();
    seedMember(Workspace::factory()->create(), $user, 'admin');
    seedMember(Workspace::factory()->create(), $user, 'viewer');

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertInertia(fn (Assert $page) => $page->has('auth.workspaces', 2));
});

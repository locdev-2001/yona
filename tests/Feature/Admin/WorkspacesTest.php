<?php

use App\Models\User;
use App\Models\Workspace;

it('lets a permitted admin list workspaces', function () {
    actingAsAdmin();

    $this->get('/admin/workspaces')->assertOk();
});

it('forbids an admin without platform.workspaces.view', function () {
    actingAsAdmin(roles: []);

    $this->get('/admin/workspaces')->assertForbidden();
});

it('shows a workspace with its members (read via the privileged path)', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($workspace, $user, 'admin');
    clearWorkspaceContext();

    actingAsAdmin();

    $this->get("/admin/workspaces/{$workspace->id}")->assertOk();
});

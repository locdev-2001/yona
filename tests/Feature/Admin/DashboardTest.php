<?php

use App\Models\Admin;
use Spatie\Permission\PermissionRegistrar;

it('lets an authenticated admin view the dashboard', function () {
    $admin = Admin::factory()->create();

    $this->actingAs($admin, 'admin')
        ->get(route('admin.dashboard'))
        ->assertOk();
});

it('redirects an unauthenticated visitor to the admin login', function () {
    $this->get(route('admin.dashboard'))->assertRedirect(route('admin.login'));
});

it('shares the admin platform permissions so the sidebar renders gated items', function () {
    actingAsAdmin(); // super_admin: holds every platform permission

    // Reproduce production: Inertia::share() resolves the admin payload eagerly
    // BEFORE the admin.scope middleware binds PLATFORM_SCOPE, so the permission
    // team id is unset at share() time. adminPayload() must re-bind it itself.
    app(PermissionRegistrar::class)->setPermissionsTeamId(null);

    $response = $this->get(route('admin.dashboard'))->assertOk();
    $permissions = $response->viewData('page')['props']['auth']['admin']['permissions'];

    expect($permissions)
        ->toContain('platform.announcements.manage')
        ->toContain('platform.workspaces.view');
});

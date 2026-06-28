<?php

use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PlatformPermissionSeeder;

it('exposes tenant CRM permissions in the membership shared prop (array cache store)', function () {
    $this->seed(PlatformPermissionSeeder::class);

    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($workspace, $user, 'admin');
    actingInWorkspace($workspace, $user);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page
            ->has('auth.membership.permissions')
            ->where('auth.membership.permissions', fn ($perms) => collect($perms)->contains('tenant.client.view'))
        );
});

it('keeps tenant menu permissions when an admin is co-authenticated in the same session', function () {
    // Regression: web + admin guards share one session cookie, so opening the
    // platform admin and a tenant workspace in the same browser leaves both guards
    // authenticated on a tenant request. The eager adminPayload() must not leave
    // the spatie/RLS scope on PLATFORM_SCOPE, or the lazy membership permissions
    // resolve empty and the whole sidebar menu disappears.
    $this->seed(PlatformPermissionSeeder::class);

    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($workspace, $user, 'admin');

    // Both guards live in the one shared session cookie; authenticate each on its
    // own guard explicitly (mirrors a browser with admin + tenant tabs open).
    actingAsAdmin();
    $this->actingAs($user, 'web');

    $this->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('auth.admin.permissions', fn ($perms) => collect($perms)->isNotEmpty())
            ->where('auth.membership.permissions', fn ($perms) => collect($perms)->contains('tenant.client.view'))
        );
});

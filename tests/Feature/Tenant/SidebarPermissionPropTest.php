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

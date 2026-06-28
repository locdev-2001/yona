<?php

use App\Enums\TenantPermission;
use Database\Seeders\PlatformPermissionSeeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

// Verify RBAC catalog (G2): 25 new domain permissions + role grant matrix.

beforeEach(function () {
    app(PermissionRegistrar::class)->setPermissionsTeamId(null);
    $this->seed(PlatformPermissionSeeder::class);
    app(PermissionRegistrar::class)->forgetCachedPermissions();
});

it('seeds all 25 domain permissions with correct format tenant.<entity>.<action>', function () {
    $entities = ['client', 'contact', 'lead', 'project', 'task'];
    $actions = ['view', 'view_own', 'create', 'update', 'delete'];

    foreach ($entities as $entity) {
        foreach ($actions as $action) {
            $name = "tenant.{$entity}.{$action}";
            expect(Permission::where('name', $name)->where('guard_name', 'web')->exists())
                ->toBeTrue("Missing permission: {$name}");
        }
    }
});

it('uses update not edit in permission names', function () {
    // G2: action must be "update", not "edit"
    expect(Permission::where('name', 'like', 'tenant.%.edit')->count())->toBe(0);
    expect(Permission::where('name', 'like', 'tenant.%.update')->count())->toBeGreaterThan(0);
});

it('admin role has all permissions including the 25 new ones', function () {
    $admin = Role::findByName('admin', 'web');
    $allValues = TenantPermission::values();

    foreach ($allValues as $perm) {
        expect($admin->hasPermissionTo($perm))->toBeTrue("admin missing: {$perm}");
    }
});

it('viewer role has only tenant.<entity>.view permissions — no mutate', function () {
    app(PermissionRegistrar::class)->setPermissionsTeamId(null);
    $viewer = Role::findByName('viewer', 'web');
    $viewerPerms = $viewer->permissions->pluck('name')->toArray();

    // viewer should have view permissions
    foreach (['client', 'contact', 'lead', 'project', 'task'] as $entity) {
        expect(in_array("tenant.{$entity}.view", $viewerPerms))->toBeTrue();
    }

    // viewer should NOT have any mutate permissions
    foreach ($viewerPerms as $perm) {
        expect($perm)->not->toContain('create')
            ->not->toContain('update')
            ->not->toContain('delete')
            ->not->toContain('view_own');
    }
});

it('sales_rep role does not have any delete permissions', function () {
    app(PermissionRegistrar::class)->setPermissionsTeamId(null);
    $salesRep = Role::findByName('sales_rep', 'web');
    $perms = $salesRep->permissions->pluck('name')->toArray();

    foreach ($perms as $perm) {
        expect($perm)->not->toContain('.delete');
    }
});

it('seeder is idempotent — running twice does not duplicate permissions', function () {
    $before = Permission::where('guard_name', 'web')->count();
    $this->seed(PlatformPermissionSeeder::class);
    $after = Permission::where('guard_name', 'web')->count();

    expect($after)->toBe($before);
});

it('permission names do not use clients.* style without tenant prefix', function () {
    // G2: NEVER clients.*, leads.*, etc. — must use tenant.<entity>.<action>
    foreach (['clients', 'contacts', 'leads', 'projects', 'tasks'] as $plural) {
        expect(Permission::where('name', 'like', "{$plural}.%")->count())->toBe(0);
    }
});

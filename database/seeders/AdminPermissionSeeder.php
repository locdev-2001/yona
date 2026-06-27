<?php

namespace Database\Seeders;

use Modules\Identity\Enums\PlatformPermission;
use Modules\Identity\Enums\PlatformRole;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Platform-plane RBAC definitions on guard `admin` — unified on spatie with the
 * tenant plane (guard `web`). Definitions are GLOBAL (workspace_id NULL), like
 * the tenant role defs; assignments are scoped to Admin::PLATFORM_SCOPE. The
 * catalog lives in code (PlatformPermission / PlatformRole enums). Idempotent.
 */
class AdminPermissionSeeder extends Seeder
{
    private const GUARD = 'admin';

    public function run(): void
    {
        $registrar = app(PermissionRegistrar::class);

        // Global definitions (no team context), mirroring PlatformPermissionSeeder.
        $registrar->setPermissionsTeamId(null);

        foreach (PlatformPermission::values() as $permission) {
            Permission::findOrCreate($permission, self::GUARD);
        }

        foreach (PlatformRole::cases() as $role) {
            Role::findOrCreate($role->value, self::GUARD)->syncPermissions($role->permissions());
        }

        $registrar->forgetCachedPermissions();
    }
}

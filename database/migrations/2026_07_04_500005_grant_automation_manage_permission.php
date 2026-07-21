<?php

use App\Enums\TenantPermission;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Same bug class as 2026_06_27_000001_grant_tags_manage_permission.php:
 * adding a permission to the enum/PlatformPermissionSeeder alone does NOT
 * grant it to already-provisioned workspaces' roles (seeder only re-runs on
 * fresh installs / explicit reseed). Register the permission and backfill it
 * onto existing roles here so tenant.automation.manage works everywhere
 * immediately, not just for new workspaces.
 *
 * Idempotent + additive (supreme DB-safety rule).
 */
return new class extends Migration
{
    /** Manager-tier roles — automation is a configuration capability (can
     * trigger real actions: send messages, move leads), scoped narrower
     * than TagsManage (granted to reps too), same tier as ProjectDelete/
     * TaskDelete in PlatformPermissionSeeder. */
    private const ROLES = ['admin', 'sales_manager', 'support_manager'];

    public function up(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId(null);

        $permission = Permission::findOrCreate(TenantPermission::AutomationManage->value, 'web');

        foreach (self::ROLES as $roleName) {
            Role::where('name', $roleName)->where('guard_name', 'web')->first()?->givePermissionTo($permission);
        }

        $registrar->forgetCachedPermissions();
    }

    public function down(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId(null);

        Permission::where('name', TenantPermission::AutomationManage->value)->where('guard_name', 'web')->delete();

        $registrar->forgetCachedPermissions();
    }
};

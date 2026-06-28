<?php

use App\Enums\TenantPermission;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * BUG-01: tag sync (SyncTagsRequest) checks `tenant.tags.manage`, but that
 * permission was never registered in the catalog, so NO role had it and every
 * tag-sync 403'd for everyone (including workspace owners).
 *
 * This registers the permission (guard `web`) and grants it to the existing
 * GLOBAL (workspace_id = NULL) entity-managing roles so tagging works on
 * already-provisioned workspaces. Fresh installs get it via PlatformPermissionSeeder.
 * Idempotent + additive (supreme DB-safety rule).
 */
return new class extends Migration
{
    /** Roles that create/update entities and therefore may tag them. */
    private const ROLES = ['admin', 'sales_manager', 'sales_rep', 'support_manager', 'support_agent', 'marketer'];

    public function up(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId(null);

        $permission = Permission::findOrCreate(TenantPermission::TagsManage->value, 'web');

        foreach (self::ROLES as $roleName) {
            Role::where('name', $roleName)->where('guard_name', 'web')->first()?->givePermissionTo($permission);
        }

        $registrar->forgetCachedPermissions();
    }

    public function down(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId(null);

        Permission::where('name', TenantPermission::TagsManage->value)->where('guard_name', 'web')->delete();

        $registrar->forgetCachedPermissions();
    }
};

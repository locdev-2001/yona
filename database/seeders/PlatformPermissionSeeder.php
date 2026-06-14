<?php

namespace Database\Seeders;

use App\Enums\TenantPermission;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Seeds the GLOBAL (workspace_id = NULL) tenant-plane role definitions + their
 * feature permissions (guard `web`). Role *definitions* are shared across all
 * workspaces; *assignments* are per-workspace (carry workspace_id). The catalog
 * lives in code (TenantPermission enum). Idempotent.
 */
class PlatformPermissionSeeder extends Seeder
{
    private const GUARD = 'web';

    public function run(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId(null);

        foreach (TenantPermission::values() as $permission) {
            Permission::findOrCreate($permission, self::GUARD);
        }

        foreach ($this->roleGrants() as $role => $permissions) {
            Role::findOrCreate($role, self::GUARD)->syncPermissions($permissions);
        }

        // Drop permissions removed from the catalog (e.g. after a prefix rename).
        Permission::where('guard_name', self::GUARD)
            ->whereNotIn('name', TenantPermission::values())
            ->delete();

        $registrar->forgetCachedPermissions();
    }

    /** @return array<string, list<string>> Workspace role → granted permissions. */
    private function roleGrants(): array
    {
        return [
            'admin' => TenantPermission::values(),
            'sales_manager' => [TenantPermission::AuditView->value],
            'support_manager' => [TenantPermission::AuditView->value],
            'sales_rep' => [],
            'support_agent' => [],
            'marketer' => [],
            'viewer' => [],
        ];
    }
}

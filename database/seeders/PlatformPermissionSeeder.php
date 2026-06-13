<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Seeds the GLOBAL (workspace_id = NULL) workspace-role definitions + their
 * feature permissions. Role *definitions* are shared across all workspaces;
 * *assignments* are per-workspace (carry workspace_id) via setPermissionsTeamId.
 * Idempotent — safe to re-run. Roles map to system-architecture.md §5.
 */
class PlatformPermissionSeeder extends Seeder
{
    /** Module-1 feature permissions. Extended per module (deal.*, export.*, …). */
    private const PERMISSIONS = [
        'workspace.update',
        'team.manage',
        'member.manage',
        'audit.view',
    ];

    /** Workspace role → granted permissions. */
    private const ROLE_PERMISSIONS = [
        'admin' => ['workspace.update', 'team.manage', 'member.manage', 'audit.view'],
        'sales_manager' => ['audit.view'],
        'support_manager' => ['audit.view'],
        'sales_rep' => [],
        'support_agent' => [],
        'marketer' => [],
        'viewer' => [],
    ];

    public function run(): void
    {
        $guard = 'web';

        // Create definitions globally (no team context) so they apply everywhere.
        app(PermissionRegistrar::class)->setPermissionsTeamId(null);

        foreach (self::PERMISSIONS as $permission) {
            Permission::findOrCreate($permission, $guard);
        }

        foreach (self::ROLE_PERMISSIONS as $role => $permissions) {
            Role::findOrCreate($role, $guard)->syncPermissions($permissions);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}

<?php

namespace Modules\Tenancy\Support;

use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

/**
 * Single source of truth for the per-request tenant scope: the Postgres RLS
 * context (app.current_workspace / app.current_user_id) and spatie's team id.
 *
 * Every layer that reads or writes tenant-scoped data binds through here —
 * IdentifyWorkspace, BindAdminPermissionScope, ResetTenantContext and the
 * Inertia shared-prop payloads — so changing how the scope is established only
 * ever requires editing one place.
 *
 * The RLS context is set with session-level set_config(..., false), which
 * persists on a connection across requests under Octane / PgBouncer / persistent
 * PDO; forget() must therefore run at the start of every request.
 */
class TenantScope
{
    /**
     * Bind the workspace as the active tenant scope for the current request.
     */
    public static function bind(int|string $workspaceId): void
    {
        DB::statement("select set_config('app.current_workspace', ?, false)", [(string) $workspaceId]);

        if (config('permission.teams')) {
            app(PermissionRegistrar::class)->setPermissionsTeamId($workspaceId);
        }
    }

    /**
     * Expose the caller's own rows to RLS before the active workspace is known
     * (bootstraps the workspace_member lookup in IdentifyWorkspace).
     */
    public static function bindUser(int|string $userId): void
    {
        DB::statement("select set_config('app.current_user_id', ?, false)", [(string) $userId]);
    }

    /**
     * Clear all tenant context — every request is default-denied until a scope
     * is established, and no leaked context survives on a pooled connection.
     */
    public static function forget(): void
    {
        DB::statement("select set_config('app.current_workspace', '', false), set_config('app.current_user_id', '', false)");

        app(PermissionRegistrar::class)->setPermissionsTeamId(null);
    }
}

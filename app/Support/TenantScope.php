<?php

namespace App\Support;

use App\Models\Workspace;
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

    /**
     * Bind $workspaceId for the duration of $callback, then RESTORE whatever
     * scope was active before (rebind it) instead of blindly clearing to
     * empty. Required for queued jobs that may run nested inside another
     * job's own scoped section — e.g. a domain-service call inside an
     * Automation node handler fires a domain event, which synchronously
     * (sync queue) dispatches ANOTHER scoped job before the outer one
     * returns. A plain bind()+forget() there would wipe the outer job's
     * still-in-progress context the moment the inner one finishes (found via
     * a real RLS-rejected write in AdvanceWorkflowRunJob when
     * ChangeLeadStageNodeHandler's LeadService::moveStage() call fired
     * LeadStageChanged, which itself dispatches EnrollWorkflowsForLeadEventJob).
     *
     * At the true top of the stack (queue worker picking up a fresh job, no
     * ambient context), "restore" degenerates to forget() — same as before.
     *
     * Also binds the `currentWorkspace` app-instance (fetching the
     * Workspace row) — required alongside the RLS session var because
     * BelongsToWorkspace's creating-hook (auto-stamping workspace_id on new
     * rows) reads the currentWorkspace() container instance, not the RLS
     * setting.
     */
    public static function runScoped(int|string $workspaceId, callable $callback): mixed
    {
        $previousWorkspaceId = DB::selectOne("select current_setting('app.current_workspace', true) as id")->id ?? null;
        $previousWorkspaceId = $previousWorkspaceId === '' ? null : $previousWorkspaceId;
        $hadAppInstance = app()->bound('currentWorkspace');
        $previousAppInstance = $hadAppInstance ? app('currentWorkspace') : null;

        try {
            // bind() + findOrFail() run INSIDE the try, not before it: if
            // findOrFail() throws (e.g. workspace soft-deleted while a
            // delayed job was in flight), the finally block below must still
            // run to restore the previous context — otherwise the failure
            // itself would be what permanently corrupts the tenant scope
            // this method exists to protect.
            self::bind($workspaceId);
            app()->instance('currentWorkspace', Workspace::findOrFail($workspaceId));

            return $callback();
        } finally {
            if ($previousWorkspaceId !== null) {
                self::bind($previousWorkspaceId);
            } else {
                self::forget();
            }

            if ($hadAppInstance) {
                app()->instance('currentWorkspace', $previousAppInstance);
            } else {
                app()->forgetInstance('currentWorkspace');
            }
        }
    }
}

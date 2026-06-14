<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpFoundation\Response;

/**
 * Clears the Postgres RLS context at the START of every web request. The
 * context is set with session-level `set_config(..., false)`, which persists on
 * a connection across requests under Octane / PgBouncer / persistent PDO. Stale
 * context from a previous request would otherwise be a cross-tenant read; this
 * guarantees every request begins default-denied until IdentifyWorkspace
 * establishes its own context.
 *
 * Also resets the spatie team scope so a leaked team-id from a previous request
 * cannot survive on a pooled/Octane worker connection.
 */
class ResetTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        DB::statement("select set_config('app.current_workspace', '', false), set_config('app.current_user_id', '', false)");

        app(PermissionRegistrar::class)->setPermissionsTeamId(null);

        return $next($request);
    }
}

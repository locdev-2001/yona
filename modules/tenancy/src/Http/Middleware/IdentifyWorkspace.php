<?php

namespace Modules\Tenancy\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Modules\Tenancy\Models\Workspace;
use Modules\Tenancy\Models\WorkspaceMember;
use Modules\Tenancy\Support\TenantScope;
use Symfony\Component\HttpFoundation\Response;

/**
 * Layer 2 of tenant isolation (arch §4, auth-model "resolution order"):
 * derive the ACTIVE workspace server-side (never from client input, BR-X14),
 * require an active membership (else 403), set the Postgres RLS context for the
 * runtime connection and bind currentWorkspace / currentMembership.
 *
 * Bootstrap uses no privileged connection: setting `app.current_user_id` lets
 * the workspace_member RLS policy expose the caller's own membership rows, so
 * the active workspace is resolved on the normal RLS-scoped connection.
 */
class IdentifyWorkspace
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request); // unauthenticated — `auth` middleware handles it
        }

        // Expose this user's own membership rows to RLS for the lookup below.
        TenantScope::bindUser($user->getKey());

        $membership = $this->resolveMembership(
            $user->getKey(),
            $request->session()->get('current_workspace_id'),
        );

        if (! $membership) {
            // Platform-staff impersonation enters a workspace here (deferred).
            abort(403, 'No active workspace membership.');
        }

        $workspaceId = $membership->workspace_id;

        // Establish the RLS + spatie team scope for the rest of the request.
        TenantScope::bind($workspaceId);

        app()->instance('currentWorkspace', Workspace::findOrFail($workspaceId));
        app()->instance('currentMembership', $membership);

        $request->session()->put('current_workspace_id', $workspaceId);

        return $next($request);
    }

    /**
     * Find the user's active membership, preferring the session workspace and
     * falling back to their earliest active membership. Runs on the normal
     * connection; RLS exposes the caller's own rows via app.current_user_id.
     */
    private function resolveMembership(int|string $userId, ?string $sessionWorkspaceId): ?WorkspaceMember
    {
        // Cross-workspace lookup by design (it decides which workspace), so drop
        // the per-tenant global scope; RLS still confines it to the caller's own
        // rows via app.current_user_id.
        $base = fn () => WorkspaceMember::withoutGlobalScope('workspace')
            ->where('user_id', $userId)
            ->where('status', 'active');

        if ($sessionWorkspaceId && $preferred = $base()->where('workspace_id', $sessionWorkspaceId)->first()) {
            return $preferred;
        }

        return $base()->oldest()->first();
    }
}

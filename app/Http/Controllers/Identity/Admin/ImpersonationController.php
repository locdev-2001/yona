<?php

namespace App\Http\Controllers\Identity\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Workspace;
use App\Support\Audit\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Platform-admin impersonation (Model A): the admin guard stays live; the web
 * guard is logged in as the target workspace member so all tenant routes, RLS,
 * and IdentifyWorkspace work unchanged. Audit reads session('impersonator_admin_id')
 * to stamp impersonated_by_admin_id on audit entries (BR-X05).
 */
class ImpersonationController extends Controller
{
    /**
     * Start impersonating a workspace member.
     *
     * POST admin/workspaces/{workspace}/members/{user}/impersonate
     */
    public function store(Request $request, Workspace $workspace, User $user): RedirectResponse
    {
        // Capability is enforced by the admin.can:platform.impersonate route middleware.
        abort_unless($user->membershipFor($workspace)?->isActive(), 422, 'User has no active membership in this workspace.');

        $request->session()->regenerate();

        // Audit as the admin actor BEFORE entering the web session, so the entry
        // is attributed to the admin and written on the privileged path.
        Audit::log($workspace, 'impersonate_start');

        Auth::guard('web')->login($user);

        session([
            'impersonator_admin_id' => auth('admin')->id(),
            'current_workspace_id' => $workspace->id,
        ]);

        return redirect()->route('dashboard');
    }

    /**
     * Stop the active impersonation session.
     *
     * POST impersonate/stop
     */
    public function destroy(Request $request): RedirectResponse
    {
        abort_unless($request->session()->has('impersonator_admin_id'), 403, 'No active impersonation session.');

        $workspaceId = $request->session()->get('current_workspace_id');
        $workspace = $workspaceId ? Workspace::find($workspaceId) : null;

        // Leave the impersonated web session + clear the flag first, so the stop
        // entry is attributed to the admin actor (privileged path).
        Auth::guard('web')->logout();
        $request->session()->forget(['impersonator_admin_id', 'current_workspace_id']);

        if ($workspace) {
            Audit::log($workspace, 'impersonate_stop');
        }

        $request->session()->regenerate();

        return redirect()->route('admin.dashboard');
    }
}

<?php

namespace Modules\Tenancy\Http\Controllers;

use App\Http\Controllers\Controller;
use Modules\Tenancy\Models\WorkspaceMember;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Switches the active workspace. The target is validated against the user's own
 * active memberships server-side (BR-X14) — the route id is never trusted
 * blindly. IdentifyWorkspace reads the chosen workspace from the session next
 * request.
 */
class WorkspaceSwitchController extends Controller
{
    public function __invoke(Request $request, string $workspace): RedirectResponse
    {
        $userId = $request->user()->getKey();

        // RLS exposes the caller's own membership rows via app.current_user_id.
        DB::statement("select set_config('app.current_user_id', ?, false)", [(string) $userId]);

        $member = WorkspaceMember::withoutGlobalScope('workspace')
            ->where('user_id', $userId)
            ->where('workspace_id', $workspace)
            ->where('status', 'active')
            ->first();

        abort_unless($member !== null, 403, 'You are not a member of that workspace.');

        $request->session()->put('current_workspace_id', $workspace);

        return back();
    }
}

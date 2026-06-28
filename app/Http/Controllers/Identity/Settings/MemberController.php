<?php

namespace App\Http\Controllers\Identity\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\MemberInviteRequest;
use App\Http\Requests\Settings\MemberUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\Team;
use App\Services\MembershipService;
use App\Models\WorkspaceMember;

/**
 * Settings → Members (admin). Invite / change role+team / deactivate.
 * Role + team are server-controlled (BR-X12); a user can never edit their own
 * membership (anti self-escalation). Workspace-scoped (404 on foreign id).
 */
class MemberController extends Controller
{
    public function index(): Response
    {
        $this->authorize('viewAny', WorkspaceMember::class);

        $members = WorkspaceMember::query()
            ->with(['user:id,name,email', 'team:id,name'])
            ->get()
            ->map(fn (WorkspaceMember $member) => [
                'id' => $member->id,
                'name' => $member->user?->name,
                'email' => $member->user?->email,
                'role' => $member->role,
                'team_id' => $member->team_id,
                'team_name' => $member->team?->name,
                'status' => $member->status,
                'is_self' => $member->user_id === auth()->id(),
            ]);

        return Inertia::render('settings/members', [
            'members' => $members,
            'teams' => Team::query()->orderBy('name')->get(['id', 'name']),
            'roles' => WorkspaceMember::ROLES,
        ]);
    }

    public function store(MemberInviteRequest $request, MembershipService $members): RedirectResponse
    {
        $members->invite(
            currentWorkspace(),
            $request->string('email')->toString(),
            $request->string('role')->toString(),
            $request->input('team_id'),
        );

        return back()->with('success', __('platform.members.invited'));
    }

    public function update(MemberUpdateRequest $request, WorkspaceMember $member, MembershipService $members): RedirectResponse
    {
        $this->authorize('update', $member);
        abort_if($member->user_id === $request->user()->id, 403, 'You cannot change your own membership.');

        $members->updateRole($member, $request->string('role')->toString());
        $members->updateTeam($member, $request->input('team_id'));

        return back()->with('success', __('platform.members.updated'));
    }

    public function destroy(Request $request, WorkspaceMember $member, MembershipService $members): RedirectResponse
    {
        $this->authorize('deactivate', $member);
        abort_if($member->user_id === $request->user()->id, 403, 'You cannot deactivate your own membership.');

        $members->deactivate($member);

        return back()->with('success', __('platform.members.updated'));
    }
}

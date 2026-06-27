<?php

namespace Modules\Identity\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;
use Modules\Tenancy\Models\WorkspaceMember;
use RuntimeException;
use Spatie\Permission\PermissionRegistrar;

/**
 * Owns membership writes (BR-X12): role/team/status are server-controlled and
 * the canonical spatie role assignment is synced from membership.role within
 * the workspace's team scope. Assumes the workspace context is established.
 */
class MembershipService
{
    public function __construct(private readonly PermissionRegistrar $registrar) {}

    /**
     * Invite a user (by email) into the workspace with a role + optional team.
     * Creates the global user if new (invite flow: random password, status
     * invited). Idempotent guard against double-membership.
     */
    public function invite(Workspace $workspace, string $email, string $role, ?string $teamId): WorkspaceMember
    {
        return DB::transaction(function () use ($workspace, $email, $role, $teamId) {
            $user = User::firstOrCreate(
                ['email' => $email],
                ['name' => Str::before($email, '@'), 'password' => Hash::make(Str::random(40))],
            );

            $existing = WorkspaceMember::where('workspace_id', $workspace->id)
                ->where('user_id', $user->id)
                ->first();

            if ($existing) {
                throw new RuntimeException('This user is already a member of the workspace.');
            }

            $member = new WorkspaceMember;
            $member->workspace_id = $workspace->id;
            $member->user_id = $user->id;
            $member->role = $role;
            $member->team_id = $teamId;
            $member->status = 'invited';
            $member->invited_at = now();
            $member->save();

            $this->syncRole($workspace->id, $user, $role);

            return $member;
        });
    }

    public function updateRole(WorkspaceMember $member, string $role): void
    {
        $member->role = $role;
        $member->save();

        $this->syncRole($member->workspace_id, $member->user, $role);
    }

    public function updateTeam(WorkspaceMember $member, ?string $teamId): void
    {
        $member->team_id = $teamId;
        $member->save();
    }

    /**
     * Deactivate a membership (BR-X03). Open-record reassignment is enforced
     * once owned business entities exist (Sales module) — hook reserved here.
     */
    public function deactivate(WorkspaceMember $member): void
    {
        $member->status = 'deactivated';
        $member->save();

        $this->registrar->setPermissionsTeamId($member->workspace_id);
        $member->user->syncRoles([]);
    }

    private function syncRole(string $workspaceId, User $user, string $role): void
    {
        $this->registrar->setPermissionsTeamId($workspaceId);
        $user->syncRoles([$role]);
    }
}

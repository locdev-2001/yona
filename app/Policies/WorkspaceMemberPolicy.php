<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WorkspaceMember;

/**
 * Membership administration is admin-only (`member.manage`). A user can never
 * change their OWN role/visibility (BR-X12) — that self-guard lives in
 * MembershipService + the controller; the policy gates the capability.
 */
class WorkspaceMemberPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('member.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('member.manage');
    }

    public function update(User $user, WorkspaceMember $member): bool
    {
        return $user->can('member.manage');
    }

    public function deactivate(User $user, WorkspaceMember $member): bool
    {
        return $user->can('member.manage');
    }
}

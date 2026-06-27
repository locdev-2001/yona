<?php

namespace Modules\Tenancy\Policies;

use Modules\Identity\Models\User;
use Modules\Tenancy\Models\WorkspaceMember;

/**
 * Membership administration is admin-only (`tenant.member.manage`). A user can never
 * change their OWN role/visibility (BR-X12) — that self-guard lives in
 * MembershipService + the controller; the policy gates the capability.
 */
class WorkspaceMemberPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tenant.member.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('tenant.member.manage');
    }

    public function update(User $user, WorkspaceMember $member): bool
    {
        return $user->can('tenant.member.manage');
    }

    public function deactivate(User $user, WorkspaceMember $member): bool
    {
        return $user->can('tenant.member.manage');
    }
}

<?php

namespace App\Policies;

use App\Models\Team;
use App\Models\User;

/**
 * Team-tree administration is admin-only (BR-X12/X13). `team.manage` is granted
 * to the admin role; permissions are scoped to the active workspace.
 */
class TeamPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('team.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('team.manage');
    }

    public function update(User $user, Team $team): bool
    {
        return $user->can('team.manage');
    }

    public function reparent(User $user, Team $team): bool
    {
        return $user->can('team.manage');
    }

    public function delete(User $user, Team $team): bool
    {
        return $user->can('team.manage');
    }
}

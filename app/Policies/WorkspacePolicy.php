<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Workspace;

/**
 * Feature gate for workspace administration. Permissions are scoped to the
 * active workspace (setPermissionsTeamId in IdentifyWorkspace), so `can()`
 * answers "for THIS workspace".
 */
class WorkspacePolicy
{
    public function view(User $user, Workspace $workspace): bool
    {
        return $user->membershipFor($workspace) !== null;
    }

    public function update(User $user, Workspace $workspace): bool
    {
        return $user->can('tenant.workspace.update');
    }
}

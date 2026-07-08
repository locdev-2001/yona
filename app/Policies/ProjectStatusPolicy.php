<?php

namespace App\Policies;

use App\Models\ProjectStatus;
use App\Models\User;

/**
 * Project statuses are workspace settings — admin-only via tenant.workspace.update.
 */
class ProjectStatusPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tenant.workspace.update');
    }

    public function create(User $user): bool
    {
        return $user->can('tenant.workspace.update');
    }

    public function update(User $user, ProjectStatus $projectStatus): bool
    {
        return $user->can('tenant.workspace.update');
    }

    public function delete(User $user, ProjectStatus $projectStatus): bool
    {
        return $user->can('tenant.workspace.update');
    }
}

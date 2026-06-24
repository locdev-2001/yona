<?php

namespace App\Policies;

use App\Models\Pipeline;
use App\Models\User;

/**
 * Pipelines are workspace settings — admin-only via tenant.workspace.update.
 * Record visibility: BelongsToWorkspace global scope hides foreign-workspace
 * records → findOrFail → abort(404) (non-enumeration BR-X15).
 */
class PipelinePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tenant.workspace.update');
    }

    public function create(User $user): bool
    {
        return $user->can('tenant.workspace.update');
    }

    public function update(User $user, Pipeline $pipeline): bool
    {
        return $user->can('tenant.workspace.update');
    }

    public function delete(User $user, Pipeline $pipeline): bool
    {
        return $user->can('tenant.workspace.update');
    }
}

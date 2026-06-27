<?php

namespace Modules\CrmSales\Policies;

use Modules\CrmSales\Models\LeadSource;
use Modules\Identity\Models\User;

/**
 * Lead sources are workspace settings — admin-only via tenant.workspace.update.
 */
class LeadSourcePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tenant.workspace.update');
    }

    public function create(User $user): bool
    {
        return $user->can('tenant.workspace.update');
    }

    public function update(User $user, LeadSource $leadSource): bool
    {
        return $user->can('tenant.workspace.update');
    }

    public function delete(User $user, LeadSource $leadSource): bool
    {
        return $user->can('tenant.workspace.update');
    }
}

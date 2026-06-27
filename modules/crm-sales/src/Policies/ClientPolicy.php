<?php

namespace Modules\CrmSales\Policies;

use Modules\CrmSales\Models\Client;
use Modules\Identity\Models\User;

/**
 * P06 — Client authorization (G2).
 * Permissions: tenant.client.{view,view_own,create,update,delete}.
 * Non-enumeration: visibility fail → controller abort(404), NOT 403.
 * Visibility rule: tenant.client.view (all) OR owner_id=self OR customer-admin.
 */
class ClientPolicy
{
    /**
     * Can the user list clients? (Always true if they have any client permission.)
     * The index query itself is filtered by visibility scope.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('tenant.client.view') || $user->can('tenant.client.view_own');
    }

    /**
     * Can the user view this specific client?
     * G2 visibility: all permission OR owner OR customer-admin.
     */
    public function view(User $user, Client $client): bool
    {
        if ($user->can('tenant.client.view')) {
            return true;
        }

        if ($user->can('tenant.client.view_own')) {
            if ((int) $client->owner_id === $user->id) {
                return true;
            }

            // Check customer-admin delegation (lazy-load to avoid N+1 in non-list contexts)
            return $client->customerAdmins()->where('users.id', $user->id)->exists();
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->can('tenant.client.create');
    }

    /**
     * Update requires the same visibility as view PLUS update permission.
     */
    public function update(User $user, Client $client): bool
    {
        if (! $user->can('tenant.client.update')) {
            return false;
        }

        return $this->view($user, $client);
    }

    public function delete(User $user, Client $client): bool
    {
        if (! $user->can('tenant.client.delete')) {
            return false;
        }

        return $this->view($user, $client);
    }
}

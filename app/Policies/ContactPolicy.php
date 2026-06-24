<?php

namespace App\Policies;

use App\Models\Client;
use App\Models\Contact;
use App\Models\User;

/**
 * P06 — Contact authorization.
 * Delegated to the parent client: contact visibility = client visibility.
 * Permissions: tenant.contact.{view,view_own,create,update,delete}.
 */
class ContactPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tenant.contact.view') || $user->can('tenant.contact.view_own');
    }

    public function view(User $user, Contact $contact): bool
    {
        // Delegate to client visibility
        $client = $contact->client;
        if (! $client) {
            return false;
        }

        return $this->canViewClient($user, $client);
    }

    public function create(User $user): bool
    {
        return $user->can('tenant.contact.create');
    }

    public function update(User $user, Contact $contact): bool
    {
        if (! $user->can('tenant.contact.update')) {
            return false;
        }

        $client = $contact->client;

        return $client && $this->canViewClient($user, $client);
    }

    public function delete(User $user, Contact $contact): bool
    {
        if (! $user->can('tenant.contact.delete')) {
            return false;
        }

        $client = $contact->client;

        return $client && $this->canViewClient($user, $client);
    }

    /**
     * Reuse client visibility logic without creating circular dependency.
     */
    private function canViewClient(User $user, Client $client): bool
    {
        if ($user->can('tenant.client.view')) {
            return true;
        }

        if ($user->can('tenant.client.view_own')) {
            if ((int) $client->owner_id === $user->id) {
                return true;
            }

            return $client->customerAdmins()->where('users.id', $user->id)->exists();
        }

        return false;
    }
}

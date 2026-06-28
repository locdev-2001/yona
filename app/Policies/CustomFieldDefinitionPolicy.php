<?php

namespace App\Policies;

use App\Models\User;
use App\Models\CustomFieldDefinition;

/**
 * Custom-field definition access is gated by custom_fields.manage / custom_fields.view.
 * Record-level workspace isolation is enforced by RLS + BelongsToWorkspace global scope
 * (route-model-binding on a foreign workspace id returns 404, not 403 — BR-X15).
 */
class CustomFieldDefinitionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('custom_fields.view') || $user->can('custom_fields.manage');
    }

    public function view(User $user, CustomFieldDefinition $definition): bool
    {
        return $user->can('custom_fields.view') || $user->can('custom_fields.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('custom_fields.manage');
    }

    public function update(User $user, CustomFieldDefinition $definition): bool
    {
        return $user->can('custom_fields.manage');
    }

    public function delete(User $user, CustomFieldDefinition $definition): bool
    {
        return $user->can('custom_fields.manage');
    }
}

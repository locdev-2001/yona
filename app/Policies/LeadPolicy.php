<?php

namespace App\Policies;

use App\Models\Lead;
use Modules\Identity\Models\User;

/**
 * P07 — Lead authorization (G2, G12).
 * Permissions: tenant.lead.{view,view_own,create,update,delete}.
 * Non-enumeration: visibility fail → controller abort(404), NOT 403.
 *
 * Visibility rule (G12): tenant.lead.view (all) OR assigned_to=self OR
 * owner_id=self OR created_by=self OR team_id ∈ user's teams OR is_public=true.
 *
 * Convert requires both tenant.lead.update AND tenant.client.create.
 */
class LeadPolicy
{
    /**
     * Can the user list leads? (Always true if they have any lead permission.)
     * The index/kanban query is filtered by visibleTo scope.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('tenant.lead.view') || $user->can('tenant.lead.view_own');
    }

    /**
     * Can the user view this specific lead?
     * G12 visibility rule: all permission OR own OR team OR is_public.
     */
    public function view(User $user, Lead $lead): bool
    {
        if ($user->can('tenant.lead.view')) {
            return true;
        }

        if ($user->can('tenant.lead.view_own')) {
            return $this->isOwnOrTeamOrPublic($user, $lead);
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->can('tenant.lead.create');
    }

    /**
     * Update requires the same visibility as view PLUS update permission.
     */
    public function update(User $user, Lead $lead): bool
    {
        if (! $user->can('tenant.lead.update')) {
            return false;
        }

        return $this->view($user, $lead);
    }

    public function delete(User $user, Lead $lead): bool
    {
        if (! $user->can('tenant.lead.delete')) {
            return false;
        }

        return $this->view($user, $lead);
    }

    /**
     * Convert: update permission on lead + create permission on client (G7).
     */
    public function convert(User $user, Lead $lead): bool
    {
        if (! $user->can('tenant.lead.update') || ! $user->can('tenant.client.create')) {
            return false;
        }

        return $this->view($user, $lead);
    }

    // ─── Internal helpers ──────────────────────────────────────────────────────

    private function isOwnOrTeamOrPublic(User $user, Lead $lead): bool
    {
        if ($lead->is_public) {
            return true;
        }

        if ((int) $lead->assigned_to === $user->id
            || (int) $lead->owner_id === $user->id
            || (int) $lead->created_by === $user->id
        ) {
            return true;
        }

        // Team check: lead's team_id ∈ user's teams
        if ($lead->team_id !== null) {
            return $user->teams()->where('teams.id', $lead->team_id)->exists();
        }

        return false;
    }
}

<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

/**
 * P08 — Project authorization (G2).
 * Permissions: tenant.project.{view,view_own,create,update,delete}.
 * Non-enumeration: visibility fail → controller abort(404), NOT 403 (BR-X15).
 *
 * Visibility rule (view_own): owns project OR is a member.
 * G12: manageMembers maps to tenant.project.update.
 */
class ProjectPolicy
{
    /**
     * Can the user list projects? Always true if they have any project permission.
     * The index query filters by visibility scope.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('tenant.project.view') || $user->can('tenant.project.view_own');
    }

    /**
     * Can the user view this specific project?
     * G2 visibility: all permission OR (view_own AND owner/member).
     */
    public function view(User $user, Project $project): bool
    {
        if ($user->can('tenant.project.view')) {
            return true;
        }

        if ($user->can('tenant.project.view_own')) {
            if ((int) $project->owner_id === $user->id) {
                return true;
            }

            // Check membership (lazy-load safe — not called in list context)
            return $project->members()->where('users.id', $user->id)->exists();
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->can('tenant.project.create');
    }

    /**
     * Update requires visibility + update permission.
     */
    public function update(User $user, Project $project): bool
    {
        if (! $user->can('tenant.project.update')) {
            return false;
        }

        return $this->view($user, $project);
    }

    public function delete(User $user, Project $project): bool
    {
        if (! $user->can('tenant.project.delete')) {
            return false;
        }

        return $this->view($user, $project);
    }

    /**
     * G12 — Gate for add/remove project members.
     * Mapped to tenant.project.update (same as update gate).
     */
    public function manageMembers(User $user, Project $project): bool
    {
        return $this->update($user, $project);
    }

    /**
     * Gate for milestone CRUD (kanban).
     */
    public function manageMilestones(User $user, Project $project): bool
    {
        return $this->update($user, $project);
    }

    /**
     * Gate for file upload/delete.
     */
    public function uploadFile(User $user, Project $project): bool
    {
        return $this->update($user, $project);
    }

    /**
     * Gate for creating/replying to discussions.
     */
    public function comment(User $user, Project $project): bool
    {
        return $this->view($user, $project);
    }
}

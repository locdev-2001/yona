<?php

namespace App\Policies;

use App\Models\Reminder;
use Modules\Identity\Models\User;

/**
 * Reminder authorization.
 *
 * - viewAny: any active workspace member.
 * - view: recipient OR creator OR tenant.member.manage.
 * - create: any active workspace member.
 * - update/delete: creator (created_by) OR recipient (user_id) OR admin role.
 *
 * Visibility fail → abort(404) (non-enumeration, BR-X15).
 */
class ReminderPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Reminder $reminder): bool
    {
        return $user->id === $reminder->user_id
            || $user->id === $reminder->created_by
            || $user->can('tenant.member.manage');
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Reminder $reminder): bool
    {
        return $user->id === $reminder->user_id
            || $user->id === $reminder->created_by
            || $user->hasRole('admin');
    }

    public function delete(User $user, Reminder $reminder): bool
    {
        return $user->id === $reminder->user_id
            || $user->id === $reminder->created_by
            || $user->hasRole('admin');
    }
}

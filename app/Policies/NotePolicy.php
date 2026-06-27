<?php

namespace App\Policies;

use App\Models\Note;
use Modules\Identity\Models\User;

/**
 * Note authorization. Notes are internal staff-only (no portal visibility).
 * - create: any authenticated workspace member.
 * - update/delete: author (user_id) or admin.
 * Visibility fail → abort(404) (non-enumeration, BR-X15).
 */
class NotePolicy
{
    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Note $note): bool
    {
        return $user->id === $note->user_id
            || $user->can('tenant.note.manage');
    }

    public function delete(User $user, Note $note): bool
    {
        return $user->id === $note->user_id
            || $user->can('tenant.note.manage');
    }
}

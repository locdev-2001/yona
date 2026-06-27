<?php

namespace App\Policies;

use App\Models\Comment;
use Modules\Identity\Models\User;

/**
 * Comment authorization.
 * - create: any authenticated workspace member.
 * - update/delete: author (user_id) or admin.
 * - G3 portal visibility: staff see all; contact-actor check is in CommentService::visibleFor().
 * Visibility fail → abort(404) (non-enumeration, BR-X15).
 */
class CommentPolicy
{
    public function create(User $user): bool
    {
        // Any authenticated workspace member may post a comment.
        return true;
    }

    public function update(User $user, Comment $comment): bool
    {
        return $user->id === $comment->user_id
            || $user->can('tenant.comment.manage');
    }

    public function delete(User $user, Comment $comment): bool
    {
        return $user->id === $comment->user_id
            || $user->can('tenant.comment.manage');
    }
}

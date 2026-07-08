<?php

namespace App\Services;

use App\Models\Comment;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Owns comment write operations and portal visibility filtering (G3).
 * Staff see all comments; contacts (portal M2) see only visible_to_customer=true.
 */
class CommentService
{
    /**
     * Add a top-level comment or a reply (parent_id for 1-level thread).
     */
    public function add(
        Model $commentable,
        string $body,
        ?string $parentId = null,
        bool $visibleToCustomer = false
    ): Comment {
        $comment = new Comment;
        $comment->workspace_id = currentWorkspace()->id;
        $comment->user_id = auth()->id();
        $comment->commentable_type = $commentable->getMorphClass();
        $comment->commentable_id = $commentable->getKey();
        $comment->parent_id = $parentId;
        $comment->body = $body;
        $comment->visible_to_customer = $visibleToCustomer;
        $comment->save();

        return $comment;
    }

    public function update(Comment $comment, string $body): void
    {
        $comment->body = $body;
        $comment->save();
    }

    public function delete(Comment $comment): void
    {
        $comment->delete();
    }

    /**
     * G3 — portal visibility gate.
     * Staff (User) → all comments for entity.
     * Contact (portal, M2) → only visible_to_customer=true.
     * null actor (unauthenticated) → only visible_to_customer=true (conservative).
     *
     * @return Collection<int, Comment>
     */
    public function visibleFor(Model $commentable, ?User $actor): Collection
    {
        $query = Comment::query()
            ->where('commentable_type', $commentable->getMorphClass())
            ->where('commentable_id', $commentable->getKey())
            ->whereNull('parent_id')
            ->with(['replies' => function ($q) use ($actor) {
                if ($actor === null) {
                    $q->where('visible_to_customer', true);
                }
            }])
            ->latest();

        // null actor = portal contact not yet resolved — restrict to customer-visible.
        if ($actor === null) {
            $query->where('visible_to_customer', true);
        }

        /** @var Collection<int, Comment> */
        return $query->get();
    }
}

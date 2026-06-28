<?php

namespace App\Models\Concerns;

use App\Models\Comment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Expose the top-level comments relation on any workspace entity.
 * The raw relation returns top-level threads only (parent_id IS NULL).
 * Portal visibility filtering is NEVER done here — use CommentService::visibleFor()
 * or CommentPolicy::view to gate contact-actor reads (G3).
 *
 * @phpstan-require-extends Model
 */
trait HasComments
{
    /** @return MorphMany<Comment, $this> */
    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable')
            ->whereNull('parent_id')
            ->latest();
    }
}

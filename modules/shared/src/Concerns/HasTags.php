<?php

namespace Modules\Shared\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Modules\Shared\Models\Tag;

/**
 * Expose the tags polymorphic many-to-many relation on any workspace entity.
 * Sync/attach/detach logic lives in TagService — NEVER in this trait.
 * order column on pivot preserves display order (Perfex tag_order).
 *
 * @phpstan-require-extends Model
 */
trait HasTags
{
    /** @return MorphToMany<Tag, $this> */
    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable', 'taggables')
            ->withPivot('order', 'workspace_id')
            ->withTimestamps()
            ->orderBy('taggables.order');
    }
}

<?php

namespace Modules\Shared\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Shared\Models\Tag;

/**
 * Owns tag attach/detach/sync operations. Deduplicates by slug per workspace.
 * Pivot workspace_id must be stamped explicitly (RLS WITH CHECK requires it on insert).
 */
class TagService
{
    /**
     * Sync entity tags: first-or-create tags by slug, assign order, detach removed tags.
     * Duplicate slug names (e.g. 'Hot' and 'hot') reuse the same Tag row.
     */
    public function sync(Model $taggable, array $tagNames): void
    {
        DB::transaction(function () use ($taggable, $tagNames) {
            $workspace = currentWorkspace();

            $tagIds = collect($tagNames)
                ->map(fn (string $name) => $this->attach($taggable, $name))
                ->pluck('id');

            // Build pivot data with workspace_id (required for RLS WITH CHECK) and order.
            $syncData = $tagIds
                ->values()
                ->mapWithKeys(fn (string $id, int $index) => [
                    $id => [
                        'order' => $index,
                        'workspace_id' => $workspace->id,
                        'id' => (string) Str::uuid(),
                    ],
                ])
                ->all();

            /** @phpstan-ignore-next-line method.notFound */
            $taggable->tags()->sync($syncData);
        });
    }

    /**
     * Attach a tag to an entity (first-or-create by slug, add to pivot if absent).
     * Returns the existing or newly created Tag.
     * slug is server-controlled ($guarded) so we bypass mass-assignment with forceFill
     * on new instances — only when actually creating (not found path).
     */
    public function attach(Model $taggable, string $name, ?string $color = null): Tag
    {
        $workspace = currentWorkspace();
        $slug = Str::slug($name);

        $tag = Tag::where('workspace_id', $workspace->id)->where('slug', $slug)->first();

        if (! $tag) {
            $tag = new Tag;
            $tag->workspace_id = $workspace->id;
            $tag->slug = $slug;
            $tag->name = $name;
            $tag->color = $color;
            $tag->save();
        }

        // Attach only if not already attached (idempotent).
        /** @phpstan-ignore-next-line method.notFound */
        if (! $taggable->tags()->where('tags.id', $tag->id)->exists()) {
            /** @phpstan-ignore-next-line method.notFound */
            $nextOrder = $taggable->tags()->count();
            /** @phpstan-ignore-next-line method.notFound */
            $taggable->tags()->attach($tag->id, [
                'order' => $nextOrder,
                'workspace_id' => $workspace->id,
                'id' => (string) Str::uuid(),
            ]);
        }

        return $tag;
    }

    /**
     * Detach a specific tag from an entity (hard-delete pivot row).
     */
    public function detach(Model $taggable, Tag $tag): void
    {
        /** @phpstan-ignore-next-line method.notFound */
        $taggable->tags()->detach($tag->id);
    }
}

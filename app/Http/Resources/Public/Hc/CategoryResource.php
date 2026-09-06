<?php

namespace App\Http\Resources\Public\Hc;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ public/api/v1/models/_category.json.jbuilder.
class CategoryResource extends JsonResource
{
    /** @param iterable<Category> $categories */
    public static function collectionFor(iterable $categories): array
    {
        return collect($categories)
            ->map(fn (Category $category) => (new self($category))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var Category $category */
        $category = $this->resource;

        return [
            'name' => $category->name,
            'slug' => $category->slug,
            'locale' => $category->locale,
            'description' => $category->description,
            'position' => $category->position,
            'meta' => ['articles_count' => $category->articles()->published()->count()],
        ];
    }
}

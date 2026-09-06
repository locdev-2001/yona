<?php

namespace App\Http\Resources;

use App\Models\Article;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/accounts/categories/_category.json.jbuilder (+ _associated_category).
class CategoryResource extends JsonResource
{
    public function __construct(Category $resource, private readonly ?string $currentLocale = null)
    {
        parent::__construct($resource);
    }

    /** @param iterable<Category> $categories */
    public static function collectionFor(iterable $categories, ?string $currentLocale = null): array
    {
        return collect($categories)
            ->map(fn (Category $category) => (new self($category, $currentLocale))->toArray(request()))
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    public static function associated(Category $category): array
    {
        return [
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'locale' => $category->locale,
            'description' => $category->description,
            'position' => $category->position,
            'account_id' => $category->account_id,
        ];
    }

    public function toArray(Request $request): array
    {
        /** @var Category $category */
        $category = $this->resource;

        $payload = self::associated($category);
        $payload['icon'] = $category->icon;
        $payload['icon_color'] = $category->icon_color;
        $payload['related_categories'] = $category->relatedCategories
            ->map(fn (Category $related) => self::associated($related))
            ->values()
            ->all();

        if ($category->parentCategory !== null) {
            $payload['parent_category'] = self::associated($category->parentCategory);
        }

        if ($category->rootCategory !== null) {
            $payload['root_category'] = self::associated($category->rootCategory);
        }

        $payload['meta'] = [
            'articles_count' => Article::search(
                Article::query()->where('articles.category_id', $category->id),
                ['locale' => $this->currentLocale],
            )->count(),
        ];

        return $payload;
    }
}

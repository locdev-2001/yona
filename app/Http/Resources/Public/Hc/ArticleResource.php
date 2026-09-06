<?php

namespace App\Http\Resources\Public\Hc;

use App\Models\Article;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ public/api/v1/models/_article.json.jbuilder (+ hc/_associated_article,
// hc/_author).
class ArticleResource extends JsonResource
{
    /** @param iterable<Article> $articles */
    public static function collectionFor(iterable $articles): array
    {
        return collect($articles)
            ->map(fn (Article $article) => (new self($article))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var Article $article */
        $article = $this->resource;

        $payload = [
            'id' => $article->id,
            'category_id' => $article->category_id,
            'title' => $article->title,
            'content' => $article->content,
            'description' => $article->description,
            'status' => $article->status,
            'position' => $article->position,
            'account_id' => $article->account_id,
            'last_updated_at' => $article->updated_at?->toJSON(),
            'slug' => $article->slug,
        ];

        if ($article->portal !== null) {
            $payload['portal'] = (new PortalResource($article->portal))->toArray($request);
        }

        if ($article->category !== null) {
            $payload['category'] = [
                'id' => $article->category->id,
                'slug' => $article->category->slug,
                'locale' => $article->category->locale,
            ];
        }

        $payload['views'] = $article->views;

        if ($article->author !== null) {
            $payload['author'] = self::author($article->author);
        }

        $payload['associated_articles'] = $article->associatedArticles
            ->map(fn (Article $associated) => self::associated($associated))
            ->values()
            ->all();

        $payload['link'] = 'hc/'.$article->portal?->slug.'/articles/'.$article->slug;

        return $payload;
    }

    /** @return array<string, mixed> */
    private static function associated(Article $article): array
    {
        $payload = [
            'id' => $article->id,
            'category_id' => $article->category_id,
            'title' => $article->title,
            'content' => $article->content,
            'description' => $article->description,
            'status' => $article->status,
            'account_id' => $article->account_id,
            'last_updated_at' => $article->updated_at?->toJSON(),
            'views' => $article->views,
        ];

        if ($article->author !== null) {
            $payload['author'] = self::author($article->author);
        }

        return $payload;
    }

    /** @return array<string, mixed> */
    private static function author(User $author): array
    {
        return [
            'available_name' => $author->availableName(),
            'name' => $author->name,
            'thumbnail' => $author->avatarUrl(),
        ];
    }
}

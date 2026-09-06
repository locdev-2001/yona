<?php

namespace App\Http\Resources\Public\Hc;

use App\Models\Article;
use App\Services\HelpCenter\ArticleSnippet;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ public/api/v1/models/_search_article.json.jbuilder — kết quả tìm kiếm
// chỉ trả đoạn trích quanh từ khoá.
class SearchArticleResource extends JsonResource
{
    public function __construct(Article $resource, private readonly string $portalSlug, private readonly string $searchQuery)
    {
        parent::__construct($resource);
    }

    /** @param iterable<Article> $articles */
    public static function collectionFor(iterable $articles, string $portalSlug, string $searchQuery): array
    {
        return collect($articles)
            ->map(fn (Article $article) => (new self($article, $portalSlug, $searchQuery))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var Article $article */
        $article = $this->resource;

        return [
            'id' => $article->id,
            'category_id' => $article->category_id,
            'title' => $article->title,
            'content' => ArticleSnippet::build((string) $article->content, $this->searchQuery),
            'link' => '/hc/'.$this->portalSlug.'/articles/'.$article->slug,
        ];
    }
}

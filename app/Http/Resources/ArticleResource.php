<?php

namespace App\Http\Resources;

use App\Models\Account;
use App\Models\Article;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/accounts/articles/_article.json.jbuilder (+ _associated_article).
// `author` chỉ xuất hiện khi tác giả còn là thành viên account (bản gốc:
// article.author&.current_account_user).
class ArticleResource extends JsonResource
{
    public function __construct(Article $resource, private readonly Account $account)
    {
        parent::__construct($resource);
    }

    /** @param iterable<Article> $articles */
    public static function collectionFor(iterable $articles, Account $account): array
    {
        return collect($articles)
            ->map(fn (Article $article) => (new self($article, $account))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var Article $article */
        $article = $this->resource;

        $payload = [
            'id' => $article->id,
            'slug' => $article->slug,
            'title' => $article->title,
            'content' => $article->content,
            'description' => $article->description,
            'status' => $article->status,
            'draft_title' => $article->draft_title,
            'draft_content' => $article->draft_content,
            'position' => $article->position,
            'account_id' => $article->account_id,
            'updated_at' => $article->updated_at?->timestamp,
            'meta' => (object) ($article->meta ?? []),
            'category' => [
                'id' => $article->category_id,
                'name' => $article->category?->name,
                'slug' => $article->category?->slug,
                'locale' => $article->category?->locale,
                'icon' => $article->category?->icon,
                'icon_color' => $article->category?->icon_color,
            ],
            'views' => $article->views,
        ];

        $author = $this->accountMemberAuthor($article);
        if ($author !== null) {
            $payload['author'] = (new AgentResource($author, $this->account))->toArray($request);
        }

        $payload['associated_articles'] = $article->associatedArticles
            ->map(fn (Article $associated) => $this->associated($associated, $request))
            ->values()
            ->all();

        return $payload;
    }

    /** @return array<string, mixed> */
    private function associated(Article $article, Request $request): array
    {
        $payload = [
            'id' => $article->id,
            'category_id' => $article->category_id,
            'title' => $article->title,
            'content' => $article->content,
            'description' => $article->description,
            'status' => $article->status,
            'account_id' => $article->account_id,
        ];

        if ($article->portal !== null) {
            $payload['portal'] = (new PortalResource($article->portal, $this->account))->toArray($request);
        }

        $payload['views'] = $article->views;

        $author = $this->accountMemberAuthor($article);
        if ($author !== null) {
            $payload['author'] = (new AgentResource($author, $this->account))->toArray($request);
        }

        return $payload;
    }

    private function accountMemberAuthor(Article $article): ?User
    {
        $author = $article->author;

        if ($author === null) {
            return null;
        }

        return $author->accountUsers()->where('account_id', $this->account->id)->exists() ? $author : null;
    }
}

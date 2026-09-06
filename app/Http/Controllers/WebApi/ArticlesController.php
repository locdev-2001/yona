<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\ArticleResource;
use App\Models\Account;
use App\Models\Article;
use App\Models\Portal;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Port từ Api::V1::Accounts::ArticlesController.
class ArticlesController extends Controller
{
    private const PER_PAGE = 25;

    private const DRAFT_ONLY_KEYS = ['draft_title', 'draft_content'];

    public function index(Request $request, Account $account, string $portalSlug): JsonResponse
    {
        $portal = $this->fetchPortal($account, $portalSlug);
        $listParams = $this->listParams($request);
        $currentPage = max(1, (int) $request->query('page', 1));

        // set_article_count: đếm theo bộ lọc KHÔNG có status/author để dựng các
        // tab (mine/published/draft/archived).
        $baseParams = collect($listParams)->except(['status', 'author_id'])->all();
        $counts = [
            'articles_count' => $this->baseQuery($portal, $baseParams)->count(),
            'mine_articles_count' => $this->baseQuery($portal, $baseParams)->searchByAuthor($request->user()->id)->count(),
            'published_count' => $this->baseQuery($portal, $baseParams)->published()->count(),
            'draft_articles_count' => $this->baseQuery($portal, $baseParams)->draft()->count(),
            'archived_articles_count' => $this->baseQuery($portal, $baseParams)->archived()->count(),
        ];

        $query = $this->baseQuery($portal, $listParams);
        $query = (string) ($listParams['category_slug'] ?? '') !== ''
            ? $query->reorder('articles.position')
            : $query->reorder('articles.updated_at', 'desc');

        $articles = $query->with(['category', 'author.accountUsers', 'associatedArticles.portal'])
            ->forPage($currentPage, self::PER_PAGE)
            ->get();

        return response()->json([
            'payload' => ArticleResource::collectionFor($articles, $account),
            'meta' => [
                'all_articles_count' => $portal->articles()->count(),
                'archived_articles_count' => $counts['archived_articles_count'],
                'articles_count' => $counts['articles_count'],
                'current_page' => $currentPage,
                'draft_articles_count' => $counts['draft_articles_count'],
                'mine_articles_count' => $counts['mine_articles_count'],
                'published_count' => $counts['published_count'],
            ],
        ]);
    }

    public function show(Request $request, Account $account, string $portalSlug, int $articleId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        return $this->payload($this->fetchArticle($account, $portalSlug, $articleId), $account, $request);
    }

    public function edit(Request $request, Account $account, string $portalSlug, int $articleId): JsonResponse
    {
        return $this->show($request, $account, $portalSlug, $articleId);
    }

    public function store(Request $request, Account $account, string $portalSlug): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $portal = $this->fetchPortal($account, $portalSlug);

        if (! $this->authorValid($account, $request->input('article.author_id'))) {
            return response()->json(['error' => 'Invalid author ID'], 422);
        }

        $params = $this->articleParams($request);
        $params['status'] ??= 'draft';

        $article = new Article([...$params, 'portal_id' => $portal->id]);

        if (($message = $article->validationSentence()) !== null) {
            return response()->json(['message' => $message], 422);
        }

        $article->save();
        $article->associateRootArticle($params['associated_article_id'] ?? null);

        return $this->payload($article->refresh(), $account, $request);
    }

    public function update(Request $request, Account $account, string $portalSlug, int $articleId): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $article = $this->fetchArticle($account, $portalSlug, $articleId);

        if (! $request->has('article')) {
            return $this->payload($article, $account, $request);
        }

        $params = $this->articleParams($request);

        // discard_invalid_author: author lạ bị bỏ qua, các thuộc tính khác vẫn lưu.
        if (array_key_exists('author_id', $params) && ! $this->authorValid($account, $params['author_id'])) {
            unset($params['author_id']);
        }

        $article->fill($params);

        if (($message = $article->validationSentence()) !== null) {
            return response()->json(['message' => $message], 422);
        }

        // Autosave chỉ đụng bản nháp thì KHÔNG được đẩy updated_at công khai.
        if ($params !== [] && array_diff(array_keys($params), self::DRAFT_ONLY_KEYS) === []) {
            // toBase(): Eloquent tự thêm updated_at vào mọi update, bản nháp thì không được.
            $article->newQuery()->toBase()->where('id', $article->id)->update($params);
            $article->syncOriginal();
        } else {
            $article->save();
        }

        return $this->payload($article->refresh(), $account, $request);
    }

    public function destroy(Request $request, Account $account, string $portalSlug, int $articleId): Response
    {
        $this->authorizeAdministrator($request);
        $this->fetchArticle($account, $portalSlug, $articleId)->delete();

        return response()->noContent(200);
    }

    public function reorder(Request $request, Account $account, string $portalSlug): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $portal = $this->fetchPortal($account, $portalSlug);

        return response()->json([
            'positions' => (object) Article::updatePositions($portal, (array) $request->input('positions_hash', [])),
        ]);
    }

    /** @param array<string, mixed> $params @return Builder<Article> */
    private function baseQuery(Portal $portal, array $params): Builder
    {
        return Article::search(Article::forPortal($portal), $params);
    }

    private function payload(Article $article, Account $account, Request $request): JsonResponse
    {
        return response()->json(['payload' => (new ArticleResource($article, $account))->toArray($request)]);
    }

    private function fetchPortal(Account $account, string $slug): Portal
    {
        return $account->portals()->where('slug', $slug)->firstOrFail();
    }

    private function fetchArticle(Account $account, string $portalSlug, int $articleId): Article
    {
        return $this->fetchPortal($account, $portalSlug)->articles()->whereKey($articleId)->firstOrFail();
    }

    /** @return array<string, mixed> */
    private function articleParams(Request $request): array
    {
        $params = collect($request->input('article', []))
            ->only([
                'title', 'slug', 'position', 'content', 'description', 'category_id', 'author_id',
                'associated_article_id', 'status', 'locale', 'draft_title', 'draft_content', 'meta',
            ])
            ->all();

        if (isset($params['meta']) && is_array($params['meta'])) {
            $params['meta'] = collect($params['meta'])->only(['title', 'description', 'tags'])->all();
        }

        return $params;
    }

    // author_belongs_to_account? — chỉ id số nguyên của thành viên account.
    private function authorValid(Account $account, mixed $authorId): bool
    {
        if ($authorId === null || $authorId === '') {
            return true;
        }

        if (! is_scalar($authorId) || preg_match('/^\d+$/', (string) $authorId) !== 1) {
            return false;
        }

        return $account->users()->whereKey((int) $authorId)->exists();
    }

    /** @return array<string, mixed> */
    private function listParams(Request $request): array
    {
        return collect($request->query())->only(['locale', 'query', 'page', 'category_slug', 'status', 'author_id'])->all();
    }
}

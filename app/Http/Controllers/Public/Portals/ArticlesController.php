<?php

namespace App\Http\Controllers\Public\Portals;

use App\Http\Resources\Public\Hc\ArticleResource;
use App\Http\Resources\Public\Hc\SearchArticleResource;
use App\Models\Article;
use App\Support\HelpCenter\ArticleMarkdown;
use Illuminate\Contracts\Support\Renderable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Port từ Public::Api::V1::Portals::ArticlesController.
class ArticlesController extends BaseController
{
    private const DEFAULT_PER_PAGE = 25;

    private const MAX_PER_PAGE = 100;

    // Ảnh 1x1 đếm lượt xem: cùng vai trò với public/assets/images/tracking-pixel.png.
    private const TRACKING_PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    public function index(Request $request, string $slug, ?string $locale = null, ?string $categorySlug = null): JsonResponse|Renderable
    {
        $portal = $this->portal($slug);
        $searchQuery = trim((string) $request->query('query', ''));
        $requestedLocale = self::withoutFormat((string) ($request->query('locale') ?? $locale ?? ''));

        $query = Article::forPortal($portal)->published();

        if ($requestedLocale !== '') {
            $query->where('articles.locale', $requestedLocale);
        }

        $articlesCount = (clone $query)->count();

        // Bản gốc KHÔNG lọc theo category_slug ở đây: list_params không nhận khoá đó.
        $query = Article::search($query, [
            'query' => $searchQuery,
            'locale' => $requestedLocale,
            'status' => $request->query('status'),
        ]);

        $query = $request->query('sort') === 'views'
            ? $query->reorder('articles.views', 'desc')
            : $query->reorder('articles.position');

        $articles = $this->paginate($request, $query)->with(['category', 'author', 'associatedArticles.author'])->get();

        if (! $this->wantsJson($request)) {
            return view('public.portal.articles.index', $this->portalViewData($request, $portal, $requestedLocale ?: null) + [
                'articles' => $articles,
                'category' => $categorySlug === null ? null : $portal->categories()->where('slug', self::withoutFormat($categorySlug))->first(),
            ]);
        }

        return response()->json([
            'payload' => $searchQuery !== ''
                ? SearchArticleResource::collectionFor($articles, $portal->slug, $searchQuery)
                : ArticleResource::collectionFor($articles),
            'meta' => ['articles_count' => $articlesCount],
        ]);
    }

    public function show(Request $request, string $slug, string $articleSlug): JsonResponse|Renderable
    {
        $article = $this->article($slug, $articleSlug);

        if ($this->wantsJson($request)) {
            // content_html: widget hiển thị bài ngay trong khung chat, render giống trang Help Center.
            return response()->json((new ArticleResource($article))->toArray($request) + ['content_html' => ArticleMarkdown::toHtml($article->content)]);
        }

        // switch_locale_with_article: locale của trang lấy theo category của bài,
        // không phải theo tham số URL.
        $locale = $article->category?->locale ?? $article->locale;

        return view('public.portal.articles.show', $this->portalViewData($request, $article->portal, $locale) + [
            'article' => $article,
            'parsedContent' => ArticleMarkdown::toHtml($article->content),
        ]);
    }

    public function showMarkdown(Request $request, string $slug, string $articleSlug): Response
    {
        $article = $this->portal($slug)->articles()->where('slug', self::withoutFormat($articleSlug))->first();

        abort_unless($article !== null && $article->isPublished(), 404);

        return response((string) $article->content, 200, ['Content-Type' => 'text/markdown; charset=utf-8']);
    }

    // Chỉ bài đã publish mới cộng lượt xem; ảnh cache riêng cho trình duyệt 24h.
    public function trackingPixel(Request $request, string $slug, string $articleSlug): Response
    {
        $article = $this->portal($slug)->articles()->where('slug', self::withoutFormat($articleSlug))->first();

        abort_if($article === null, 404);

        if ($article->isPublished()) {
            $article->incrementViewCount();
        }

        return response(base64_decode(self::TRACKING_PIXEL), 200, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }

    private function article(string $slug, string $articleSlug): Article
    {
        return $this->portal($slug)->articles()->where('slug', self::withoutFormat($articleSlug))->firstOrFail();
    }

    /**
     * @param  Builder<Article>  $query
     * @return Builder<Article>
     */
    private function paginate(Request $request, $query)
    {
        $perPage = $request->query('per_page');

        if ((string) $perPage === '') {
            return $query;
        }

        $perPage = min((int) $perPage, self::MAX_PER_PAGE);
        $perPage = $perPage < 1 ? self::DEFAULT_PER_PAGE : $perPage;

        return $query->forPage(max(1, (int) $request->query('page', 1)), $perPage);
    }
}

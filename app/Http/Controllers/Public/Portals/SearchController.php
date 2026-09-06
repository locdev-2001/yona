<?php

namespace App\Http\Controllers\Public\Portals;

use App\Http\Resources\Public\Hc\SearchArticleResource;
use App\Models\Article;
use Illuminate\Contracts\Support\Renderable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ Public::Api::V1::Portals::SearchController.
// Bản gốc chỉ render HTML; ở đây thêm nhánh JSON cùng shape với kết quả tìm kiếm
// của trang articles để ô tìm kiếm ở hero dùng chung một component.
class SearchController extends BaseController
{
    private const PER_PAGE = 10;

    public function index(Request $request, string $slug, string $locale): JsonResponse|Renderable
    {
        $portal = $this->portal($slug);
        $query = trim((string) $request->query('query', ''));
        $page = max(1, (int) $request->query('page', 1));

        $matches = collect();
        $totalCount = 0;

        if ($query !== '') {
            $base = Article::search(
                Article::forPortal($portal)->published()->where('articles.locale', self::withoutFormat($locale)),
                ['query' => $query],
            );
            $totalCount = (clone $base)->count();
            $matches = $base->with(['category'])->forPage($page, self::PER_PAGE)->get();
        }

        if ($this->wantsJson($request)) {
            return response()->json([
                'payload' => SearchArticleResource::collectionFor($matches, $portal->slug, $query),
                'meta' => ['articles_count' => $matches->count(), 'current_page' => $page],
            ]);
        }

        return view('public.portal.search.index', $this->portalViewData($request, $portal, self::withoutFormat($locale)) + [
            'query' => $query,
            'articles' => $matches,
            'totalCount' => $totalCount,
            'currentPage' => $page,
            'totalPages' => (int) ceil($totalCount / self::PER_PAGE),
        ]);
    }
}

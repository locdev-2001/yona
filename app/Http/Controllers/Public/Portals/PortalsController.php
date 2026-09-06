<?php

namespace App\Http\Controllers\Public\Portals;

use App\Http\Resources\Public\Hc\PortalResource;
use App\Models\Article;
use App\Models\Category;
use App\Models\Portal;
use Illuminate\Contracts\Support\Renderable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;

// Port từ Public::Api::V1::PortalsController + concern PortalHomeData.
class PortalsController extends BaseController
{
    public function show(Request $request, string $slug, ?string $locale = null): JsonResponse|Renderable|RedirectResponse
    {
        $portal = $this->portal($slug);

        if ($this->wantsJson($request)) {
            return response()->json((new PortalResource($portal))->toArray($request));
        }

        // redirect_to_portal_with_locale: `/hc/{slug}` luôn nhảy sang locale mặc định.
        if ($locale === null) {
            return redirect('/hc/'.$portal->slug.'/'.$portal->defaultLocale());
        }

        $locale = self::withoutFormat($locale);

        return view('public.portal.show', $this->portalViewData($request, $portal, $locale) + [
            'recommendedCategories' => $this->recommendedCategories($portal, $locale),
            'recommendedArticles' => $this->recommendedArticles($portal, $locale),
            'homeCategories' => $this->homeCategories($portal, $locale),
            'featuredArticles' => $this->featuredArticles($portal, $locale),
            'uncategorizedArticles' => $this->uncategorizedArticles($portal, $locale),
        ]);
    }

    public function sitemap(Request $request, string $slug): Response
    {
        $portal = $this->portal($slug);
        $helpCenterUrl = $portal->custom_domain ?: rtrim((string) config('app.url'), '/');

        if (! str_contains($helpCenterUrl, '://')) {
            $helpCenterUrl = 'https://'.$helpCenterUrl;
        }

        $articles = $portal->articles()->where('status', Article::STATUS_PUBLISHED)->get();

        return response()
            ->view('public.portal.sitemap', compact('portal', 'articles', 'helpCenterUrl'))
            ->header('Content-Type', 'application/xml');
    }

    /** @return Collection<int, Category> */
    private function recommendedCategories(Portal $portal, string $locale)
    {
        return $this->orderedByIds(
            $portal->categories()->where('locale', $locale)->whereIn('id', $portal->popularCategoryIds($locale))->get(),
            $portal->popularCategoryIds($locale),
        );
    }

    /** @return Collection<int, Article> */
    private function recommendedArticles(Portal $portal, string $locale)
    {
        $ids = $portal->popularArticleIds($locale);

        return $this->orderedByIds(
            $this->publishedArticles($portal, $locale)->whereIn('articles.id', $ids)->get(),
            $ids,
        );
    }

    // Danh mục có ít nhất một bài đã publish, đúng thứ tự position.
    /** @return Collection<int, Category> */
    private function homeCategories(Portal $portal, string $locale)
    {
        return $portal->categories()
            ->where('locale', $locale)
            ->whereHas('articles', fn ($query) => $query->where('status', Article::STATUS_PUBLISHED))
            ->orderBy('position')
            ->get();
    }

    /** @return Collection<int, Article> */
    private function featuredArticles(Portal $portal, string $locale)
    {
        $categoryIds = $this->homeCategories($portal, $locale)->pluck('id');

        return $this->publishedArticles($portal, $locale)
            ->whereIn('articles.category_id', $categoryIds)
            ->reorder('articles.views', 'desc')
            ->limit(6)
            ->get();
    }

    /** @return Collection<int, Article> */
    private function uncategorizedArticles(Portal $portal, string $locale)
    {
        return $this->publishedArticles($portal, $locale)
            ->whereNull('articles.category_id')
            ->reorder('articles.position')
            ->get();
    }

    private function publishedArticles(Portal $portal, string $locale)
    {
        return Article::forPortal($portal)->published()->where('articles.locale', $locale);
    }

    /**
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Collection<int, TModel>  $records
     * @param  list<int>  $ids
     * @return Collection<int, TModel>
     */
    private function orderedByIds($records, array $ids)
    {
        $byId = $records->keyBy('id');

        return collect($ids)->map(fn (int $id) => $byId->get($id))->filter()->values();
    }
}

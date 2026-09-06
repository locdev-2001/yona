<?php

namespace App\Http\Controllers\Public\Portals;

use App\Http\Resources\Public\Hc\CategoryResource;
use App\Models\Article;
use Illuminate\Contracts\Support\Renderable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

// Port từ Public::Api::V1::Portals::CategoriesController.
class CategoriesController extends BaseController
{
    public function index(Request $request, string $slug, string $locale): JsonResponse|RedirectResponse
    {
        $portal = $this->portal($slug);

        if (! $this->wantsJson($request)) {
            // Bản gốc: format.html chuyển vĩnh viễn về trang chủ portal theo locale.
            return redirect('/hc/'.$portal->slug.'/'.self::withoutFormat($locale), 301);
        }

        $categories = $portal->categories()->orderBy('position')->get();

        return response()->json(['payload' => CategoryResource::collectionFor($categories)]);
    }

    public function show(Request $request, string $slug, string $locale, string $categorySlug): JsonResponse|Renderable
    {
        $portal = $this->portal($slug);
        $category = $portal->categories()
            ->where('locale', self::withoutFormat($locale))
            ->where('slug', self::withoutFormat($categorySlug))
            ->firstOrFail();

        if ($this->wantsJson($request)) {
            return response()->json((new CategoryResource($category))->toArray($request));
        }

        $articles = $category->articles()
            ->where('status', Article::STATUS_PUBLISHED)
            ->orderBy('position')
            ->with('author')
            ->get();

        return view('public.portal.categories.show', $this->portalViewData($request, $portal, $category->locale) + [
            'category' => $category,
            'articles' => $articles,
        ]);
    }
}

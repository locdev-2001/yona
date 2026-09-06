<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Account;
use App\Models\Category;
use App\Models\Portal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Port từ Api::V1::Accounts::CategoriesController.
class CategoriesController extends Controller
{
    public function index(Request $request, Account $account, string $portalSlug): JsonResponse
    {
        $portal = $this->fetchPortal($account, $portalSlug);
        $locale = $request->query('locale');

        $categories = Category::search(Category::forPortal($portal), ['locale' => $locale])
            ->with(['relatedCategories', 'parentCategory', 'rootCategory'])
            ->get();

        return response()->json([
            'payload' => CategoryResource::collectionFor($categories, $locale),
            'meta' => [
                'current_page' => (int) $request->query('page', 1),
                'categories_count' => $categories->count(),
            ],
        ]);
    }

    public function show(Request $request, Account $account, string $portalSlug, int $categoryId): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $category = $this->fetchCategory($account, $portalSlug, $categoryId);

        return response()->json(['payload' => (new CategoryResource($category))->toArray($request)]);
    }

    public function store(Request $request, Account $account, string $portalSlug): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $portal = $this->fetchPortal($account, $portalSlug);

        $category = new Category([...$this->categoryParams($request), 'portal_id' => $portal->id]);

        if (($message = $category->validationSentence()) !== null) {
            return response()->json(['message' => $message], 422);
        }

        $category->save();
        $category->relatedCategories()->sync($this->relatedCategoryIds($request, $portal));

        return response()->json(['payload' => (new CategoryResource($category->refresh()))->toArray($request)]);
    }

    public function update(Request $request, Account $account, string $portalSlug, int $categoryId): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $portal = $this->fetchPortal($account, $portalSlug);
        $category = $this->fetchCategoryIn($portal, $categoryId);

        $category->fill($this->categoryParams($request));

        if (($message = $category->validationSentence()) !== null) {
            return response()->json(['message' => $message], 422);
        }

        $category->save();

        $relatedIds = $this->relatedCategoryIds($request, $portal);
        if ($relatedIds !== []) {
            $category->relatedCategories()->sync($relatedIds);
        }

        return response()->json(['payload' => (new CategoryResource($category->refresh()))->toArray($request)]);
    }

    public function destroy(Request $request, Account $account, string $portalSlug, int $categoryId): Response
    {
        $this->authorizeAdministrator($request);
        $this->fetchCategory($account, $portalSlug, $categoryId)->delete();

        return response()->noContent(200);
    }

    public function reorder(Request $request, Account $account, string $portalSlug): Response
    {
        $this->authorizeAdministrator($request);
        $portal = $this->fetchPortal($account, $portalSlug);

        Category::updatePositions($portal, (array) $request->input('positions_hash', []));

        return response()->noContent(200);
    }

    private function fetchPortal(Account $account, string $slug): Portal
    {
        return $account->portals()->where('slug', $slug)->firstOrFail();
    }

    private function fetchCategory(Account $account, string $portalSlug, int $categoryId): Category
    {
        return $this->fetchCategoryIn($this->fetchPortal($account, $portalSlug), $categoryId);
    }

    private function fetchCategoryIn(Portal $portal, int $categoryId): Category
    {
        return $portal->categories()->whereKey($categoryId)->firstOrFail();
    }

    /** @return array<string, mixed> */
    private function categoryParams(Request $request): array
    {
        $params = collect($request->input('category', []))
            ->only(['name', 'description', 'position', 'slug', 'locale', 'icon', 'icon_color', 'parent_category_id', 'associated_category_id'])
            ->all();

        // Form gửi `icon: ''` khi không chọn biểu tượng; middleware
        // ConvertEmptyStringsToNull của Laravel biến nó thành null, mà hai cột này
        // NOT NULL (mặc định ''). Trả lại chuỗi rỗng để bỏ biểu tượng vẫn lưu được.
        foreach (['icon', 'icon_color'] as $column) {
            if (array_key_exists($column, $params) && $params[$column] === null) {
                $params[$column] = '';
            }
        }

        return $params;
    }

    /** @return list<int> */
    private function relatedCategoryIds(Request $request, Portal $portal): array
    {
        $ids = $request->input('category.related_category_ids', []);

        if (! is_array($ids) || $ids === []) {
            return [];
        }

        return Category::forPortal($portal)->whereIn('id', $ids)->orderBy('id')->pluck('id')->all();
    }
}

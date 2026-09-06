<?php

namespace App\Http\Controllers\WebApi\Articles;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Article;
use App\Models\Portal;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

// Port từ Api::V1::Accounts::Articles::BulkActionsController.
// `translate` là tính năng Captain (enterprise) — giữ nguyên 501 như CE.
class BulkActionsController extends Controller
{
    public function translate(Request $request, Account $account, string $portalSlug): Response
    {
        $this->authorizeAdministrator($request);

        return response()->noContent(501);
    }

    public function updateStatus(Request $request, Account $account, string $portalSlug): Response|JsonResponse
    {
        $this->authorizeAdministrator($request);
        $articles = $this->articles($request, $account, $portalSlug);

        if ($articles->isEmpty()) {
            return $this->error('No articles found to process');
        }

        $status = (string) $request->input('status');
        if (! isset(Article::STATUSES[$status])) {
            return $this->error('Invalid status value');
        }

        return $this->applyToEach($articles, fn (Article $article) => ['status' => $status]);
    }

    public function updateCategory(Request $request, Account $account, string $portalSlug): Response|JsonResponse
    {
        $this->authorizeAdministrator($request);
        $portal = $this->fetchPortal($account, $portalSlug);
        $articles = $portal->articles()->whereIn('id', (array) $request->input('ids', []))->get();

        if ($articles->isEmpty()) {
            return $this->error('No articles found to process');
        }

        $categoryId = $request->input('category_id');
        if (! $portal->categories()->whereKey($categoryId)->exists()) {
            return $this->error('Category not found in this portal');
        }

        return $this->applyToEach($articles, fn (Article $article) => ['category_id' => $categoryId]);
    }

    public function deleteArticles(Request $request, Account $account, string $portalSlug): Response|JsonResponse
    {
        $this->authorizeAdministrator($request);
        $articles = $this->articles($request, $account, $portalSlug);

        if ($articles->isEmpty()) {
            return $this->error('No articles found to process');
        }

        $articles->each(fn (Article $article) => $article->delete());

        return response()->noContent(200);
    }

    /** @param Collection<int, Article> $articles */
    private function applyToEach(Collection $articles, callable $attributes): Response|JsonResponse
    {
        $invalid = null;

        DB::transaction(function () use ($articles, $attributes, &$invalid) {
            foreach ($articles as $article) {
                $article->fill($attributes($article));

                if (($message = $article->validationSentence()) !== null) {
                    $invalid = $message;

                    return;
                }

                $article->save();
            }
        });

        return $invalid === null ? response()->noContent(200) : $this->error($invalid);
    }

    /** @return Collection<int, Article> */
    private function articles(Request $request, Account $account, string $portalSlug): Collection
    {
        return $this->fetchPortal($account, $portalSlug)
            ->articles()
            ->whereIn('id', (array) $request->input('ids', []))
            ->get();
    }

    private function fetchPortal(Account $account, string $slug): Portal
    {
        return $account->portals()->where('slug', $slug)->firstOrFail();
    }

    private function error(string $message): JsonResponse
    {
        return response()->json(['error' => $message], 422);
    }
}

<?php

namespace App\Http\Controllers\Widget;

use App\Models\WidgetUpdate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Tab "Cập nhật": không cần phiên khách, như danh sách campaign. */
class UpdatesController extends WidgetController
{
    public const PER_PAGE = 20;

    public function index(Request $request): JsonResponse
    {
        $updates = WidgetUpdate::query()
            ->visibleIn($this->inbox($request))
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->simplePaginate(self::PER_PAGE);

        return response()->json([
            'payload' => collect($updates->items())->map(fn (WidgetUpdate $update) => self::present($update, withBody: false))->values(),
            'meta' => ['has_more' => $updates->hasMorePages()],
        ]);
    }

    public function show(Request $request, int $updateId): JsonResponse
    {
        $update = WidgetUpdate::query()->visibleIn($this->inbox($request))->findOrFail($updateId);

        return response()->json(self::present($update, withBody: true));
    }

    private static function present(WidgetUpdate $update, bool $withBody): array
    {
        return [
            'id' => $update->id,
            'title' => $update->title,
            'tag' => $update->tag,
            'cover_url' => $update->cover_url,
            'cta' => $update->cta_url === null ? null : ['label' => $update->cta_label, 'url' => $update->cta_url],
            'published_at' => $update->published_at?->getTimestamp(),
            'excerpt' => mb_strimwidth(trim(strip_tags((string) $update->body)), 0, 140, '…'),
            ...($withBody ? ['body' => $update->body] : []),
        ];
    }
}

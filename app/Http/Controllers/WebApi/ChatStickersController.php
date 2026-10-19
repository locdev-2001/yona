<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Services\Chat\ChatMemberships;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Bảng sticker của khung soạn chat: kho chung (bộ không thuộc account nào, đã xuất bản).
// Cùng hình dạng phản hồi với bảng sticker của hộp thư để dùng lại StickerPicker.
class ChatStickersController extends Controller
{
    private const LIMIT = 60;

    public function index(Request $request, Chat $chat, ChatMemberships $memberships): JsonResponse
    {
        $memberships->membership($request->user(), $chat);
        $query = is_string($request->query('q')) ? trim($request->query('q')) : null;
        $packs = StickerPack::query()->whereNull('account_id')->published()->orderBy('position')->get();
        $packId = is_string($request->query('pack')) ? (int) $request->query('pack') : ($query ? null : $packs->first()?->id);

        $stickers = Sticker::query()
            ->whereIn('sticker_pack_id', $packs->modelKeys())
            ->where('status', Sticker::STATUS_READY)
            ->when($packId, fn ($scope) => $scope->where('sticker_pack_id', $packId))
            ->when($query, fn ($scope) => $scope->where(fn ($match) => $match
                ->where('label', 'ilike', "%{$query}%")
                ->orWhereRaw('keywords::text ilike ?', ["%{$query}%"])))
            ->orderBy('position')
            ->limit(self::LIMIT)
            ->get();

        return response()->json([
            'source' => $query ? 'search' : 'pack',
            'query' => $query,
            'pack_id' => $packId ? (string) $packId : null,
            'stickers' => $stickers->map(fn (Sticker $sticker) => [
                'id' => (string) $sticker->id,
                'image_url' => $sticker->image_url,
                'pack_id' => (string) $sticker->sticker_pack_id,
                'label' => $sticker->label,
            ])->values(),
            'packs' => $packs->map(fn (StickerPack $pack) => [
                'id' => (string) $pack->id,
                'cover_url' => Sticker::query()->where('sticker_pack_id', $pack->id)->where('status', Sticker::STATUS_READY)->orderBy('position')->first()?->image_url ?? '',
            ])->values(),
        ]);
    }
}

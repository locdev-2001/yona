<?php

namespace App\Http\Controllers\WebApi\Conversations;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Services\Channels\Stickers\StickerCatalogException;
use App\Services\Channels\Stickers\StickerLibrary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Bảng chọn sticker của khung soạn: mặc định là sticker gần đây trong hộp thư,
 * `q` để tìm theo từ khoá, `pack` để mở cả một bộ. Kênh không khai
 * `outbound_sticker` thì 422 `capability_not_supported` như mọi năng lực chưa khai.
 * `suggestions` là gợi ý khi gõ, chỉ từ kho Yona.
 */
class StickersController extends Controller
{
    public function index(Request $request, Account $account, int $conversationId, StickerLibrary $stickers): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $query = $request->query('q');
        $packId = $request->query('pack');

        try {
            return response()->json($stickers->browse(
                $conversation->inbox,
                is_string($query) ? $query : null,
                is_string($packId) ? $packId : null,
            ));
        } catch (StickerCatalogException $exception) {
            return response()->json(['error' => $exception->getMessage(), 'code' => $exception->code()], 422);
        }
    }

    public function suggestions(Request $request, Account $account, int $conversationId, StickerLibrary $stickers): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $query = $request->query('q');

        return response()->json($stickers->suggest($conversation->inbox, is_string($query) ? $query : null));
    }
}

<?php

namespace App\Http\Controllers\WebApi\Conversations;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Inbox;
use App\Services\Channels\Stickers\StickerCatalogException;
use App\Services\Channels\Stickers\StickerLibrary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Bảng chọn sticker của khung soạn: mặc định là sticker gần đây trong hộp thư,
 * `q` để tìm theo từ khoá, `pack` để mở cả một bộ. Kênh không khai
 * `outbound_sticker` thì 422 `capability_not_supported` như mọi năng lực chưa khai.
 * `suggestions` là gợi ý khi gõ, chỉ từ kho Yona. Bản theo hộp thư phục vụ khung soạn
 * hội thoại mới khi chưa có hội thoại nào.
 */
class StickersController extends Controller
{
    public function index(Request $request, Account $account, int $conversationId, StickerLibrary $stickers): JsonResponse
    {
        return $this->browse($request, $this->fetchConversationForUser($request, $account, $conversationId)->inbox, $stickers);
    }

    public function suggestions(Request $request, Account $account, int $conversationId, StickerLibrary $stickers): JsonResponse
    {
        return $this->suggest($request, $this->fetchConversationForUser($request, $account, $conversationId)->inbox, $stickers);
    }

    public function inboxIndex(Request $request, Account $account, int $inboxId, StickerLibrary $stickers): JsonResponse
    {
        return $this->browse($request, $this->visibleInbox($request, $account, $inboxId), $stickers);
    }

    public function inboxSuggestions(Request $request, Account $account, int $inboxId, StickerLibrary $stickers): JsonResponse
    {
        return $this->suggest($request, $this->visibleInbox($request, $account, $inboxId), $stickers);
    }

    private function browse(Request $request, Inbox $inbox, StickerLibrary $stickers): JsonResponse
    {
        $query = $request->query('q');
        $packId = $request->query('pack');

        try {
            return response()->json($stickers->browse(
                $inbox,
                is_string($query) ? $query : null,
                is_string($packId) ? $packId : null,
            ));
        } catch (StickerCatalogException $exception) {
            return response()->json(['error' => $exception->getMessage(), 'code' => $exception->code()], 422);
        }
    }

    private function suggest(Request $request, Inbox $inbox, StickerLibrary $stickers): JsonResponse
    {
        $query = $request->query('q');

        return response()->json($stickers->suggest($inbox, is_string($query) ? $query : null));
    }

    private function visibleInbox(Request $request, Account $account, int $inboxId): Inbox
    {
        return $request->user()
            ->assignedInboxes($account, $request->attributes->get('currentAccountUser'))
            ->whereKey($inboxId)
            ->firstOrFail();
    }
}

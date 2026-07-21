<?php

namespace App\Http\Controllers\Inbox;

use App\Enums\TenantPermission;
use App\Http\Controllers\Controller;
use App\Models\ChannelAccount;
use App\Models\Conversation;
use App\Models\Message;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\ZaloNotConnectedException;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloInteractionService;
use App\Services\Inbox\MessageStateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * P06a — tương tác lên tin: thả/gỡ reaction + sticker search.
 *
 * Reaction: gate platform_meta như quote (HIGH-1) → gọi dispatcher /zca →
 * CHỈ ghi message_reactions SAU 2xx (không optimistic — tránh misfire lệch
 * 2 chiều không self-heal). Ghi qua MessageStateService (DRY: cùng upsert
 * monotonic + broadcast với reaction inbound P02).
 *
 * Permission: tenant.zalo.manage (caller đầu tiên của dispatcher — điều kiện GO).
 */
class MessageInteractionController extends Controller
{
    public function react(
        Request $request,
        Conversation $conversation,
        Message $message,
        ZaloInteractionService $interactionService,
        MessageStateService $stateService,
    ): JsonResponse {
        $this->authorize('update', $conversation);
        abort_unless(auth()->user()?->can(TenantPermission::ZaloManage->value), 403);
        abort_unless($message->conversation_id === $conversation->id, 404);

        $validated = $request->validate([
            'icon' => ['nullable', 'string', 'max:16'], // '' / null = gỡ (NONE)
        ]);
        $icon = (string) ($validated['icon'] ?? '');

        // Review INFO: không có source_id thì applyReactions không resolve được row
        // → thà 422 tường minh còn hơn ok:true mà không có gì xảy ra.
        if (empty($message->source_id)) {
            return response()->json([
                'message' => 'Tin này thiếu metadata nền tảng — không thả cảm xúc được (tin cũ).',
                'error_code' => 'reaction_unavailable',
            ], 422);
        }

        try {
            $interactionService->addReaction($conversation, $message, $icon);
        } catch (\InvalidArgumentException) {
            return response()->json([
                'message' => 'Tin này thiếu metadata nền tảng — không thả cảm xúc được (tin cũ).',
                'error_code' => 'reaction_unavailable',
            ], 422);
        } catch (ZaloNotConnectedException $e) {
            return response()->json(['message' => $e->getMessage(), 'error_code' => 'not_connected'], 422);
        } catch (\RuntimeException $e) {
            $code = str_contains($e->getMessage(), 'rate_limited') ? 'reaction_rate_limited' : 'reaction_failed';

            return response()->json(['message' => 'Không thả được cảm xúc. Thử lại sau.', 'error_code' => $code], 422);
        }

        // Dispatcher 2xx → ghi DB (reactor = tài khoản kênh của mình). Echo event
        // reaction từ Zalo về sau tự khớp (idempotent monotonic P02).
        $accountUid = ChannelAccount::where('id', $conversation->channel_account_id)->value('account_uid') ?? 'self';
        $stateService->applyReactions($conversation->channel_account_id, [[
            'target_msg_id' => (string) $message->source_id,
            'reactor_uid' => (string) $accountUid,
            'icon' => $icon,
            'reacted_at' => now(),
        ]]);

        return response()->json([
            'ok' => true,
            'reactions' => $message->reactions()->get(['reactor_uid', 'icon', 'reacted_at']),
        ]);
    }

    public function stickers(Request $request, Conversation $conversation, ZaloInteractionService $interactionService): JsonResponse
    {
        $this->authorize('update', $conversation);

        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:50'],
        ]);

        try {
            $stickers = $interactionService->searchStickers($conversation, $validated['q']);
        } catch (ZaloNotConnectedException $e) {
            return response()->json(['message' => $e->getMessage(), 'error_code' => 'not_connected'], 422);
        } catch (\RuntimeException) {
            return response()->json(['message' => 'Không tìm được sticker. Thử lại sau.', 'error_code' => 'sticker_search_failed'], 422);
        }

        return response()->json(['stickers' => $stickers]);
    }
}

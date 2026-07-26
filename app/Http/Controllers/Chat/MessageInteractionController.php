<?php

namespace App\Http\Controllers\Chat;

use App\Enums\TenantPermission;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Modules\Chat\Delivery\InteractionPipeline;
use App\Modules\Chat\Port\ChannelRegistry;
use App\Modules\Chat\Port\Exception\UnsupportedCapabilityException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * P06a — tương tác lên tin: thả/gỡ cảm xúc + tìm sticker.
 *
 * Controller chỉ làm ba việc: kiểm quyền, kiểm dữ liệu vào, dịch ngoại lệ của
 * lõi thành mã lỗi cho FE. Mọi thứ còn lại nằm ở InteractionPipeline — nhờ vậy
 * mở diện này ra API ngoài chỉ cần thêm một controller mỏng khác.
 *
 * Không import class nào của kênh cụ thể.
 */
class MessageInteractionController extends Controller
{
    public function react(
        Request $request,
        Conversation $conversation,
        Message $message,
        ChannelRegistry $channels,
        InteractionPipeline $pipeline,
    ): JsonResponse {
        $this->authorize('update', $conversation);
        abort_unless(auth()->user()?->can(TenantPermission::ZaloManage->value), 403);
        abort_unless($message->conversation_id === $conversation->id, 404);

        $validated = $request->validate([
            'icon' => ['nullable', 'string', 'max:16'], // '' / null = gỡ
        ]);

        try {
            $pipeline->react(
                $channels->driver($conversation->channel),
                $conversation,
                $message,
                (string) ($validated['icon'] ?? ''),
                (int) auth()->id(),
            );
        } catch (UnsupportedCapabilityException $e) {
            return response()->json([
                'message' => 'Kênh này chưa hỗ trợ thả cảm xúc.',
                'error_code' => $e->errorCode(),
            ], 422);
        } catch (\InvalidArgumentException) {
            return response()->json([
                'message' => 'Tin này thiếu metadata nền tảng — không thả cảm xúc được (tin cũ).',
                'error_code' => 'reaction_unavailable',
            ], 422);
        } catch (\RuntimeException $e) {
            if (str_contains($e->getMessage(), 'rate_limited')) {
                return response()->json([
                    'message' => 'Thao tác quá nhanh — thử lại sau.',
                    'error_code' => 'reaction_rate_limited',
                ], 429);
            }

            return response()->json([
                'message' => 'Không thả được cảm xúc. Thử lại sau.',
                'error_code' => 'reaction_failed',
            ], 422);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Kênh chưa sẵn sàng. Thử lại sau.',
                'error_code' => 'not_connected',
            ], 422);
        }

        return response()->json([
            'ok' => true,
            'reactions' => $message->reactions()->get(['reactor_uid', 'icon', 'reacted_at']),
        ]);
    }

    public function stickers(
        Request $request,
        Conversation $conversation,
        ChannelRegistry $channels,
        InteractionPipeline $pipeline,
    ): JsonResponse {
        $this->authorize('update', $conversation);

        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:50'],
        ]);

        try {
            $stickers = $pipeline->searchStickers(
                $channels->driver($conversation->channel),
                $conversation,
                $validated['q'],
                (int) auth()->id(),
            );
        } catch (UnsupportedCapabilityException $e) {
            return response()->json([
                'message' => 'Kênh này chưa hỗ trợ sticker.',
                'error_code' => $e->errorCode(),
            ], 422);
        } catch (\RuntimeException $e) {
            if (str_contains($e->getMessage(), 'rate_limited')) {
                return response()->json([
                    'message' => 'Tìm sticker quá nhanh — thử lại sau 1 phút.',
                    'error_code' => 'sticker_rate_limited',
                ], 429);
            }

            return response()->json([
                'message' => 'Không tìm được sticker. Thử lại sau.',
                'error_code' => 'sticker_search_failed',
            ], 422);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Kênh chưa sẵn sàng. Thử lại sau.',
                'error_code' => 'not_connected',
            ], 422);
        }

        return response()->json(['stickers' => $stickers]);
    }
}

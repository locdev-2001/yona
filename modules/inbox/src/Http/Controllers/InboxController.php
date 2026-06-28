<?php

namespace Modules\Inbox\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Inbox\Channel\ChannelManager;
use Modules\Inbox\Contracts\SendException;
use Modules\Inbox\Models\Conversation;
use Modules\Inbox\Models\Message;

/**
 * P07-F-1 — Inbox controller (channel-agnostic).
 *
 * index:    list Conversations workspace, filter, paginate → Inertia Modules.Inbox.inbox/index.
 * messages: paginate Messages asc, đánh dấu đã đọc.
 * send:     gọi ChannelManager→driver→sendMessage (KHÔNG biết kênh cụ thể).
 *           Bắt SendException (inbox contract) → 422.
 *           Driver (channel-zalo) wrap exception kênh thành SendException trước khi throw lên đây.
 *
 * N1 cô lập: chỉ import inbox contracts — không import channel-zalo / billing class cụ thể.
 */
class InboxController extends Controller
{
    /**
     * GET /inbox — danh sách hội thoại workspace, RLS auto-filter.
     */
    public function index(Request $request): Response
    {
        $query = Conversation::orderByDesc('last_message_at');

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('peer_name', 'ilike', '%'.$search.'%')
                    ->orWhere('peer_phone', 'ilike', '%'.$search.'%')
                    ->orWhere('peer_uid', 'ilike', '%'.$search.'%');
            });
        }

        if ($request->boolean('unread')) {
            $query->where('unread_count', '>', 0);
        }

        if ($channel = $request->string('channel')->toString()) {
            $query->where('channel', $channel);
        }

        $conversations = $query->paginate(30)->withQueryString();

        // Finding 6: wire hasAny() → FE hiện empty/disabled state khi tắt tất cả module kênh (N2).
        $channelsAvailable = app(ChannelManager::class)->hasAny();

        return Inertia::render('Modules.Inbox.inbox/index', [
            'conversations' => $conversations,
            'filters' => $request->only(['q', 'unread', 'channel']),
            'channelsAvailable' => $channelsAvailable,
        ]);
    }

    /**
     * GET /inbox/conversations/{conversation}/messages
     * Trả messages paginate asc; đánh dấu unread_count = 0.
     */
    public function messages(Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        $messages = Message::where('conversation_id', $conversation->id)
            ->orderBy('platform_sent_at')
            ->orderBy('created_at')
            ->paginate(50);

        // Đánh dấu đã đọc (atomic: dùng update để không trigger observers)
        if ($conversation->unread_count > 0) {
            Conversation::where('id', $conversation->id)->update(['unread_count' => 0]);
        }

        return response()->json($messages);
    }

    /**
     * POST /inbox/conversations/{conversation}/messages
     * Gửi outbound qua ChannelManager (channel-agnostic).
     * Driver (channel-zalo) wrap exceptions thành SendException.
     */
    public function send(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('update', $conversation);

        $validated = $request->validate([
            'text' => ['nullable', 'string', 'max:5000'],
        ]);

        $text = isset($validated['text']) ? trim((string) $validated['text']) : '';

        if ($text === '') {
            return response()->json(['message' => 'Nội dung không được để trống.'], 422);
        }

        try {
            /** @var ChannelManager $channelManager */
            $channelManager = app(ChannelManager::class);
            $channelManager->driver($conversation->channel)->sendMessage($conversation, ['text' => $text]);

            // Trả message mới nhất direction=out sau khi gửi thành công
            $message = Message::where('conversation_id', $conversation->id)
                ->where('direction', 'out')
                ->latest('created_at')
                ->first();

            return response()->json($message, 201);
        } catch (SendException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => $e->errorCode,
            ], 422);
        } catch (\InvalidArgumentException $e) {
            // Finding 5b: driver() ném InvalidArgumentException khi channel-module tắt (chưa đăng ký).
            // InvalidArgumentException extends LogicException, KHÔNG phải RuntimeException → không bị catch bên dưới.
            return response()->json([
                'message' => 'Kênh không khả dụng.',
                'error_code' => 'channel_unavailable',
            ], 422);
        } catch (\RuntimeException $e) {
            // QuotaExceededException từ billing (chưa wrap thành SendException) — fail-safe
            if (str_contains(get_class($e), 'Quota')) {
                return response()->json([
                    'message' => 'Hết quota hội thoại tháng này. Nâng gói để tiếp tục.',
                    'error_code' => 'quota_exceeded',
                ], 422);
            }
            throw $e;
        }
    }
}

<?php

namespace App\Http\Controllers\Inbox;

use App\Contracts\SendException;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\ZaloConnection;
use App\Modules\Integration\ChannelManager;
use App\Services\ZaloGroupBackfillService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * P07-F-1 — Inbox controller (channel-agnostic, internal-first).
 *
 * index:    list Conversations workspace, filter, paginate → Inertia inbox/index.
 * messages: paginate Messages asc, đánh dấu đã đọc.
 * send:     gọi ChannelManager→driver→sendMessage (KHÔNG biết kênh cụ thể).
 *           Bắt SendException (app contract) → 422.
 *
 * Internal-first: ChannelManager nằm trong app/Modules/Integration/. Xóa module
 * → class không tồn tại → channelsAvailable=false (empty state) + send() → 422.
 */
class InboxController extends Controller
{
    /**
     * GET /inbox — danh sách hội thoại workspace, RLS auto-filter.
     */
    public function index(Request $request, ?Conversation $conversation = null): Response
    {
        // Deep-link /inbox/{conversation}: preselect (RLS đã chặn cross-workspace → 404).
        if ($conversation !== null) {
            $this->authorize('view', $conversation);
        }

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

        // Internal-first: Integration module xóa → class vắng → empty state (N2).
        $channelsAvailable = class_exists(ChannelManager::class)
            ? app(ChannelManager::class)->hasAny()
            : false;

        // Tier 0: truyền trạng thái kết nối Zalo xuống FE để hiển thị banner gap.
        // RLS auto-filter theo workspace. Phase 1 ~1 kết nối/workspace → first() đủ (YAGNI).
        $zaloConnection = ZaloConnection::orderByDesc('last_connected_at')
            ->first(['id', 'display_name', 'state', 'session_lost_reason', 'last_connected_at', 'last_session_lost_at']);

        return Inertia::render('inbox/index', [
            'conversations' => $conversations,
            'filters' => $request->only(['q', 'unread', 'channel']),
            'channelsAvailable' => $channelsAvailable,
            'selectedConversation' => $conversation,
            'zaloConnection' => $zaloConnection,
        ]);
    }

    /**
     * POST /inbox/resync
     * Kéo backfill tin nhóm bị mất trong gap kết nối.
     * Tin mới sẽ vào DB async qua webhook (idempotent ingest).
     */
    public function resync(ZaloGroupBackfillService $backfillService): JsonResponse
    {
        // RLS tự lọc theo workspace — chỉ lấy connection của workspace hiện tại
        $connections = ZaloConnection::where('state', 'connected')
            ->whereNull('deleted_at')
            ->get(['connection_id']);

        $totalFetched = 0;
        foreach ($connections as $conn) {
            $totalFetched += $backfillService->run($conn->connection_id);
        }

        return response()->json(['ok' => true, 'fetched' => $totalFetched]);
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
     * Driver wrap exceptions thành SendException.
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

        // Internal-first: Integration module xóa → không có driver → 422 thay vì fatal.
        if (! class_exists(ChannelManager::class)) {
            return response()->json([
                'message' => 'Kênh không khả dụng.',
                'error_code' => 'channel_unavailable',
            ], 422);
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
            // Finding 5b: driver() ném InvalidArgumentException khi channel chưa đăng ký.
            // InvalidArgumentException extends LogicException, KHÔNG phải RuntimeException → không bị catch bên dưới.
            return response()->json([
                'message' => 'Kênh không khả dụng.',
                'error_code' => 'channel_unavailable',
            ], 422);
        } catch (\RuntimeException $e) {
            // QuotaExceededException từ metering (chưa wrap thành SendException) — fail-safe
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

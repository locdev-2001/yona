<?php

namespace App\Http\Controllers\Inbox;

use App\Contracts\SendException;
use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Models\ChannelAccount;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\ZaloConnection;
use App\Modules\Integration\ChannelManager;
use App\Services\ZaloGroupBackfillService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
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

        // P07 — rail 2 tầng: lọc theo tài khoản kết nối (shop có thể cắm nhiều số Zalo).
        if ($channelAccountId = $request->string('channel_account_id')->toString()) {
            $query->where('channel_account_id', $channelAccountId);
        }

        // P07 — chia ca trực: ?assigned=me|unassigned|{userId}
        if ($assigned = $request->string('assigned')->toString()) {
            match (true) {
                $assigned === 'me' => $query->where('assigned_user_id', auth()->id()),
                $assigned === 'unassigned' => $query->whereNull('assigned_user_id'),
                default => $query->where('assigned_user_id', (int) $assigned),
            };
        }

        // P07 — lọc theo label (tags polymorphic)
        if ($tagId = $request->string('tag')->toString()) {
            $query->whereHas('tags', fn ($q) => $q->where('tags.id', $tagId));
        }

        $conversations = $query->with(['channelAccount:id,display_name', 'assignedUser:id,name'])->paginate(30)->withQueryString();

        // Internal-first: Integration module xóa → class vắng → empty state (N2).
        $channelsAvailable = class_exists(ChannelManager::class)
            ? app(ChannelManager::class)->hasAny()
            : false;

        // P07 — danh sách tài khoản kênh (đa tài khoản) + count hội thoại active/account,
        // thay $zaloConnection first() cũ (giả định 1 kết nối/workspace).
        $channelAccounts = ChannelAccount::query()
            ->withCount(['conversations as conversations_count' => fn ($q) => $q->whereNull('deleted_at')])
            ->orderBy('created_at')
            ->get(['id', 'channel', 'display_name', 'avatar_url', 'status']);

        return Inertia::render('inbox/index', [
            'conversations' => $conversations,
            'filters' => $request->only(['q', 'unread', 'channel', 'channel_account_id']),
            'channelsAvailable' => $channelsAvailable,
            'selectedConversation' => $conversation,
            'channelAccounts' => $channelAccounts,
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
            'attachment_id' => ['nullable', 'uuid'],
            // P06a — quote-reply + sticker
            'reply_to_message_id' => ['nullable', 'uuid'],
            'sticker' => ['nullable', 'array'],
            'sticker.id' => ['required_with:sticker', 'integer', 'min:1'],
            'sticker.cate_id' => ['required_with:sticker', 'integer', 'min:0'],
            'sticker.type' => ['nullable', 'integer'],
            'sticker.url' => ['nullable', 'url:http,https'],
            'sticker.thumbnail' => ['nullable', 'url:http,https'],
        ]);

        $text = isset($validated['text']) ? trim((string) $validated['text']) : '';

        // P06a — reply: tin gốc phải thuộc đúng conversation này
        $replyTo = null;
        if (! empty($validated['reply_to_message_id'])) {
            $replyTo = Message::where('id', $validated['reply_to_message_id'])
                ->where('conversation_id', $conversation->id)
                ->firstOrFail();

            if ($text === '') {
                return response()->json(['message' => 'Trả lời trích dẫn cần nội dung text.'], 422);
            }
        }

        $sticker = $validated['sticker'] ?? null;

        // P04 — media: resolve attachment đã upload (phải thuộc đúng conversation này).
        $media = null;
        if (! empty($validated['attachment_id'])) {
            $attachment = Attachment::where('id', $validated['attachment_id'])
                ->where('attachable_type', 'conversation')
                ->where('attachable_id', $conversation->id)
                ->firstOrFail();

            $media = [
                // Bridge fetch: signed URL TTL ngắn (A3 — private disk, không public).
                'file_url' => URL::temporarySignedRoute('inbox.attachments.raw', now()->addMinutes(15), [
                    'attachmentKey' => $attachment->attachment_key,
                    'ws' => $conversation->workspace_id,
                ]),
                // Hiển thị chat: URL bền, quyền = xem conversation (không hết hạn).
                'display_url' => route('inbox.attachments.show', $attachment->attachment_key),
                'media_kind' => $attachment->mediaKind(),
                'filename' => $attachment->original_name,
                'attachment_id' => $attachment->id,
            ];
        }

        if ($text === '' && $media === null && $sticker === null) {
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
            $message = $channelManager->driver($conversation->channel)
                ->sendMessage($conversation, [
                    'text' => $text !== '' ? $text : null,
                    'media' => $media,
                    'reply_to' => $replyTo,
                    'sticker' => $sticker,
                ]);

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

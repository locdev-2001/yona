<?php

namespace App\Http\Controllers\Inbox;

use App\Contracts\SendException;
use App\Enums\TenantPermission;
use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Models\ChannelAccount;
use App\Models\Conversation;
use App\Models\Message;
use App\Modules\Chat\Port\Capability\SupportsHistoryResync;
use App\Modules\Chat\Port\ChannelRegistry;
use App\Modules\Integration\Data\OutboundMessage;
use App\Services\Inbox\MessageItemSerializer;
use App\Services\Inbox\OutboundSendPipeline;
use App\Services\Inbox\SeenSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

/**
 * P07-F-1 — Inbox controller (channel-agnostic, internal-first).
 *
 * index:    list Conversations workspace, filter, paginate → Inertia inbox/index.
 * messages: paginate Messages asc, đánh dấu đã đọc.
 * send:     gọi ChannelRegistry→driver→sendMessage (KHÔNG biết kênh cụ thể).
 *           Bắt SendException (app contract) → 422.
 *
 * Internal-first: ChannelRegistry nằm trong app/Modules/Integration/. Xóa module
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

        // Account đã ngắt CHỦ ĐỘNG (disconnected) → hội thoại ẩn khỏi inbox (list + count),
        // KHÔNG xóa — re-QR account sẽ hiện lại. Conversation chưa gắn account (legacy) vẫn hiển thị.
        $query->whereDoesntHave('channelAccount', fn ($acc) => $acc->where('status', 'disconnected'));

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

        // P07 — lọc theo label (tags polymorphic)
        if ($tagId = $request->string('tag')->toString()) {
            $query->whereHas('tags', fn ($q) => $q->where('tags.id', $tagId));
        }

        $conversations = $query->with(['channelAccount:id,display_name', 'assignedUser:id,name'])->paginate(30)->withQueryString();

        // Internal-first: Integration module xóa → class vắng → empty state (N2).
        $channelsAvailable = class_exists(ChannelRegistry::class)
            ? app(ChannelRegistry::class)->hasAny()
            : false;

        // P07 — danh sách tài khoản kênh (đa tài khoản) + count hội thoại active/account,
        // thay $zaloConnection first() cũ (giả định 1 kết nối/workspace).
        // Account đã ngắt CHỦ ĐỘNG (disconnected) biến mất khỏi mọi UI inbox —
        // hội thoại cũ vẫn nằm trong "Tất cả hộp thư"; re-QR sẽ set lại 'connected'.
        $channelAccounts = ChannelAccount::query()
            ->where('status', '!=', 'disconnected')
            ->withCount(['conversations as conversations_count' => fn ($q) => $q->whereNull('deleted_at')])
            ->orderBy('created_at')
            ->get(['id', 'channel', 'display_name', 'avatar_url', 'status']);

        return Inertia::render('inbox/index', [
            'conversations' => $conversations,
            'filters' => $request->only(['q', 'unread', 'channel', 'channel_account_id', 'tag']),
            'channelsAvailable' => $channelsAvailable,
            'selectedConversation' => $conversation,
            'channelAccounts' => $channelAccounts,
            // P06b — seen-sync toggle (default OFF, chỉ tenant.zalo.manage thấy nút)
            'seenSyncEnabled' => app(SeenSyncService::class)->enabled(),
            'canManageZalo' => (bool) auth()->user()?->can(TenantPermission::ZaloManage->value),
            // P11 — capability flags per-kênh: FE ẩn/hiện nút theo flags, KHÔNG biết kênh
            'channelCapabilities' => $this->channelCapabilities($channelAccounts->pluck('channel')->unique()->values()->all()),
        ]);
    }

    /**
     * P11 — map channel → capability flags (từ driver, data không rẽ nhánh).
     *
     * @param  list<string>  $channels
     * @return array<string, array<string, bool|string>>
     */
    private function channelCapabilities(array $channels): array
    {
        if (! class_exists(ChannelRegistry::class)) {
            return [];
        }

        $manager = app(ChannelRegistry::class);
        $map = [];
        foreach ($channels as $channel) {
            try {
                $map[$channel] = $manager->driver($channel)->capabilities()->toArray();
            } catch (\InvalidArgumentException) {
                // kênh chưa đăng ký driver — FE fallback all-false (ẩn nút)
            }
        }

        return $map;
    }

    /**
     * POST /inbox/resync
     * Kéo lại lịch sử bị mất trên MỌI kênh làm được việc đó.
     *
     * Mỗi lần gọi là một loạt request tới nền tảng bên ngoài, nên phải có quyền
     * và có ngưỡng — trước đây không có cả hai.
     */
    public function resync(ChannelRegistry $channels): JsonResponse
    {
        abort_unless(auth()->user()?->can(TenantPermission::ZaloManage->value), 403);

        $workspaceId = (string) currentWorkspace()?->id;

        if (! RateLimiter::attempt('inbox-resync:'.$workspaceId, 1, fn () => true, 300)) {
            return response()->json([
                'message' => 'Đang đồng bộ — thử lại sau 5 phút.',
                'error_code' => 'resync_rate_limited',
            ], 429);
        }

        // Ngưỡng ngày lùi là hằng của TỪNG kênh — lõi không được biết giá trị đó.
        $totalFetched = 0;
        foreach ($channels->supporting(SupportsHistoryResync::class) as $driver) {
            /** @var SupportsHistoryResync $driver */
            $totalFetched += $driver->resyncHistory($workspaceId);
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
     * POST /inbox/conversations/{conversation}/read
     * FE gọi khi tin đến lúc hội thoại đang mở trên màn hình (tab visible) —
     * mở thread lần đầu đã được stream endpoint reset sẵn. Idempotent.
     */
    public function markRead(Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        if ($conversation->unread_count > 0) {
            Conversation::where('id', $conversation->id)->update(['unread_count' => 0]);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * POST /inbox/conversations/{conversation}/messages
     * Gửi outbound qua ChannelRegistry (channel-agnostic).
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

            // Review LOW-1: bridge nhánh file không gắn quote → khách KHÔNG thấy trích
            // dẫn dù portal hiển thị. Chặn trung thực thay vì drop im lặng.
            if (! empty($validated['attachment_id'])) {
                return response()->json(['message' => 'Chưa hỗ trợ trả lời trích dẫn kèm tệp — gửi tách 2 tin.'], 422);
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

        $outbound = new OutboundMessage(
            text: $text !== '' ? $text : null,
            media: $media,
            sticker: $sticker,
            replyTo: $replyTo,
        );

        if ($outbound->isEmpty()) {
            return response()->json(['message' => 'Nội dung không được để trống.'], 422);
        }

        // Internal-first: Integration module xóa → không có driver → 422 thay vì fatal.
        if (! class_exists(ChannelRegistry::class)) {
            return response()->json([
                'message' => 'Kênh không khả dụng.',
                'error_code' => 'channel_unavailable',
            ], 422);
        }

        try {
            /** @var ChannelRegistry $channelManager */
            $channelManager = app(ChannelRegistry::class);
            // MỌI outbound đi qua OutboundSendPipeline — transport, thống kê,
            // broadcast nằm chung một chỗ cho mọi kênh.
            $message = app(OutboundSendPipeline::class)->send(
                $channelManager->driver($conversation->channel),
                $conversation,
                $outbound,
            );

            // Shape = stream item — FE append thẳng vào thread, KHÔNG reload.
            // (Đồng thời không lộ platform_meta thô như trả nguyên model trước đây.)
            return response()->json(MessageItemSerializer::fromModel($message), 201);
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
        }
    }
}

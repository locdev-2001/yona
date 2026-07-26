<?php

namespace App\Http\Controllers\Chat;

use App\Contracts\SendException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\SendMessageRequest;
use App\Models\ChannelAccount;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\ProfileIdentity;
use App\Modules\Chat\Delivery\ComposeMessageInput;
use App\Modules\Chat\Delivery\ComposeMessageService;
use App\Modules\Chat\Delivery\DeliveryPipeline;
use App\Modules\Chat\Delivery\Exception\ComposeMessageException;
use App\Modules\Chat\Delivery\SeenSyncService;
use App\Modules\Chat\Port\Capability\SupportsHistoryResync;
use App\Modules\Chat\Port\ChannelDescriptor;
use App\Modules\Chat\Port\ChannelRegistry;
use App\Modules\Chat\Timeline\MessageItemSerializer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
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
 * Sổ đăng ký kênh luôn tồn tại: chat là chức năng lõi, không tắt được. Kênh nội
 * bộ là đế nên registry không bao giờ rỗng — cái tắt được chỉ là phích cắm ngoài.
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
                // Tên hiển thị của luồng, khóa thô, hoặc bất kỳ bí danh nào của
                // người trong luồng — số điện thoại nay sống ở bí danh.
                $q->where('thread_name', 'ilike', '%'.$search.'%')
                    ->orWhere('sender_uid', 'ilike', '%'.$search.'%')
                    ->orWhereIn('profile_id', ProfileIdentity::query()
                        ->where('value', 'ilike', '%'.$search.'%')
                        ->select('profile_id'));
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

        $channelsAvailable = app(ChannelRegistry::class)->hasAny();

        $descriptors = app(ChannelRegistry::class)->descriptors();

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
            // Kèm tên + avatar từng người trong luồng, dựng từ bí danh. Chỉ cho
            // hội thoại ĐANG MỞ — gọi cho cả danh sách là một truy vấn mỗi hàng.
            'selectedConversation' => $conversation === null ? null : [
                ...$conversation->toArray(),
                'members' => $conversation->memberProfiles(),
            ],
            'channelAccounts' => $channelAccounts,
            // Danh tính kênh — FE lấy nhãn, ký hiệu, trang kết nối, khóa hạn mức
            // từ đây thay vì tự biết tên kênh nào.
            'channelDescriptors' => array_map(fn (ChannelDescriptor $d) => $d->toArray(), $descriptors),
            'seenSyncEnabled' => $this->seenSyncByChannel($descriptors),
            'canManageChannel' => $this->manageableChannels($descriptors),
            // P11 — capability flags per-kênh: FE ẩn/hiện nút theo flags, KHÔNG biết kênh
            'channelCapabilities' => $this->channelCapabilities($channelAccounts->pluck('channel')->unique()->values()->all()),
        ]);
    }

    /**
     * Quyền quản trị TỪNG kênh — quyền do descriptor của kênh khai, không phải
     * một cờ chung mang tên một nhà cung cấp.
     *
     * @param  array<string, ChannelDescriptor>  $descriptors
     * @return array<string, bool>
     */
    private function manageableChannels(array $descriptors): array
    {
        $user = auth()->user();

        return array_map(
            fn (ChannelDescriptor $descriptor) => (bool) $user?->can($descriptor->managePermission->value),
            $descriptors,
        );
    }

    /**
     * Trạng thái báo-đã-xem theo TỪNG kênh: "đã xem" là diện của kênh, bật cho
     * kênh này không có nghĩa là bật cho kênh khác.
     *
     * @param  array<string, ChannelDescriptor>  $descriptors
     * @return array<string, bool>
     */
    private function seenSyncByChannel(array $descriptors): array
    {
        $seenSync = app(SeenSyncService::class);

        return array_map(fn (ChannelDescriptor $descriptor) => $seenSync->enabled($descriptor->key), $descriptors);
    }

    /**
     * P11 — map channel → capability flags (từ driver, data không rẽ nhánh).
     *
     * @param  list<string>  $channels
     * @return array<string, array<string, bool|string>>
     */
    private function channelCapabilities(array $channels): array
    {
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
        // Kéo lịch sử chạm nhiều kênh cùng lúc — đòi quyền quản trị của MỌI kênh
        // làm được việc đó, chứ không phải quyền của riêng một nhà cung cấp.
        foreach ($channels->supporting(SupportsHistoryResync::class) as $key => $driver) {
            abort_unless(auth()->user()?->can($channels->descriptor($key)->managePermission->value), 403);
        }

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
    public function send(SendMessageRequest $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('update', $conversation);

        try {
            $outbound = app(ComposeMessageService::class)->compose(
                $conversation,
                ComposeMessageInput::fromValidated($request->validated()),
            );
        } catch (ComposeMessageException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => $e->errorCode,
            ], 422);
        }

        try {
            /** @var ChannelRegistry $channelManager */
            $channelManager = app(ChannelRegistry::class);
            // MỌI outbound đi qua DeliveryPipeline — transport, thống kê,
            // broadcast nằm chung một chỗ cho mọi kênh.
            $message = app(DeliveryPipeline::class)->send(
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

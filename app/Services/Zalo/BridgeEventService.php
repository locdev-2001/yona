<?php

namespace App\Services\Zalo;

use App\Messaging\Inbound\MessageEventService;
use App\Models\Channel\Zalo;
use App\Models\Inbox;
use Illuminate\Support\Facades\Log;

/**
 * Điều phối một sự kiện webhook của bridge về đúng dịch vụ xử lý. Port từ
 * ZaloPersonalWebhookController của nhánh `main`, bỏ toàn bộ phần bind RLS/
 * TenantScope (bản rewrite phân tách theo `account_id` như bản gốc, không RLS).
 */
class BridgeEventService
{
    private const SOCIAL_KIND_GROUP = 'group_event';

    /** `GroupEventType.UPDATE_AVATAR` của zca-js. */
    private const GROUP_EVENT_AVATAR_UPDATED = 'update_avatar';

    public function __construct(
        private readonly MessageEventService $messageEvents,
        private readonly TypingRelayService $typing,
        private readonly ZaloContactProfile $contactProfiles,
    ) {}

    /** @param array<string, mixed> $payload */
    public function handle(array $payload): void
    {
        $channel = $this->resolveChannel($payload);

        if ($channel === null || $channel->inbox === null || ! $channel->account->isActive()) {
            return;
        }

        match ($payload['type'] ?? 'inbound') {
            'inbound' => $this->handleInbound($channel->inbox, $payload),
            'friend_request' => $this->handleFriendRequest($channel->inbox, $payload),
            'bridge_session' => $this->handleSession($channel, $payload),
            'relay_event' => $this->handleRelayEvent($channel->inbox, $payload),
            'social_event' => $this->handleSocialEvent($channel->inbox, $payload),
            default => null,
        };
    }

    /** @param array<string, mixed> $payload */
    private function resolveChannel(array $payload): ?Zalo
    {
        $connectionId = (int) ($payload['connection_id'] ?? 0);

        return $connectionId > 0 ? Zalo::query()->find($connectionId) : null;
    }

    /** @param array<string, mixed> $payload */
    private function handleInbound(Inbox $inbox, array $payload): void
    {
        (new IncomingMessageService($inbox, $payload))->perform();

        // Khách gửi rồi thu hồi ngay: sự kiện `undo` có thể tới TRƯỚC tin của nó.
        $this->messageEvents->applyPendingRecall($inbox, isset($payload['source_id']) ? (string) $payload['source_id'] : null);
    }

    /**
     * Lời mời kết bạn (docs/channel-capabilities.md §2.4 `friend_request`): người
     * lạ chưa nhắn được vào hộp thư, nhưng đây đã là một lượt tiếp xúc thật —
     * dựng LIÊN HỆ NHÁP + hội thoại để agent thấy và trả lời, không phải Lead
     * (luật §2.4: chỉ thăng Lead khi có SĐT/email).
     *
     * Quy về đúng hình dạng payload `inbound` rồi đi qua IncomingMessageService:
     * dedupe theo `source_id`, dựng liên hệ theo uid, nhãn thẻ và bong bóng dùng
     * chung đường với mọi loại tin khác — không có đường ghi tin thứ hai.
     *
     * @param  array<string, mixed>  $payload
     */
    private function handleFriendRequest(Inbox $inbox, array $payload): void
    {
        $user = is_array($payload['user'] ?? null) ? $payload['user'] : [];
        $uid = (string) ($user['uid'] ?? '');

        if ($uid === '') {
            return;
        }

        $message = filled($payload['message'] ?? null) ? (string) $payload['message'] : null;

        (new IncomingMessageService($inbox, [
            'peer_uid' => $uid,
            'thread_id' => $uid,
            'thread_type' => 0,
            'source_id' => $payload['source_id'] ?? null,
            'direction' => 'in',
            'user' => ['name' => $user['name'] ?? null, 'avatar' => $user['avatar'] ?? null],
            'content' => $message,
            'friend_request' => array_filter([
                'external_id' => $uid,
                'message' => $message,
            ]),
        ]))->perform();
    }

    /**
     * Sự kiện nhóm (đổi tên, đổi ảnh, vào/rời nhóm…) mang tên và ảnh hiện tại của nhóm:
     * làm mới liên hệ nhóm ngay, không chờ tin kế. Nhóm chưa từng nhắn thì không mở gì.
     * Lời mời kết bạn đã đi đường `friend_request` riêng.
     *
     * @param  array<string, mixed>  $payload
     */
    private function handleSocialEvent(Inbox $inbox, array $payload): void
    {
        $event = is_array($payload['event'] ?? null) ? $payload['event'] : [];
        $group = is_array($event['data'] ?? null) ? $event['data'] : [];
        $groupId = (string) ($payload['thread_id'] ?? '');

        if (($payload['social_kind'] ?? null) !== self::SOCIAL_KIND_GROUP || $groupId === '' || ! array_key_exists('groupName', $group)) {
            return;
        }

        $contact = $inbox->contactInboxes()->where('source_id', $groupId)->first()?->contact;

        if ($contact === null) {
            return;
        }

        $avatar = self::text($group['fullAvt'] ?? null) ?? self::text($group['avt'] ?? null);

        $this->contactProfiles->refresh(
            $contact,
            $groupId,
            self::text($group['groupName']),
            $avatar,
            isGroup: true,
            avatarChanged: ($event['type'] ?? null) === self::GROUP_EVENT_AVATAR_UPDATED,
        );
    }

    private static function text(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }

    /** @param array<string, mixed> $payload */
    private function handleSession(Zalo $channel, array $payload): void
    {
        $reported = (string) ($payload['state'] ?? '');

        // Bridge hôm nay chỉ phát session_ok/session_lost (webhook-contract §2b),
        // nhưng trạng thái lạ KHÔNG được rơi vào im lặng như trước: hoặc ánh xạ
        // được, hoặc phải để lại dấu vết mà tìm (zalo-deep-audit 6.2).
        $state = match ($reported) {
            'session_ok', 'connected', 'ready' => Zalo::STATE_CONNECTED,
            'session_lost', 'disconnected', 'closed' => Zalo::STATE_SESSION_LOST,
            'qr_waiting', 'logging_in' => Zalo::STATE_QR_WAITING,
            default => null,
        };

        if ($state === null) {
            Log::warning('[ZALO] bridge_session mang trạng thái chưa biết', [
                'connection_id' => $channel->connectionId(),
                'state' => $reported,
            ]);

            return;
        }

        $detail = isset($payload['detail']) && is_string($payload['detail']) ? $payload['detail'] : null;

        // Phiên sống lại thì mạch ngắt phải mở ra, nếu không tin vẫn bị chặn êm.
        if ($state === Zalo::STATE_CONNECTED) {
            app(ZaloHealthMonitor::class)->reset($channel->connectionId());
        }

        $channel->markState($state, $detail ?? ($state === Zalo::STATE_SESSION_LOST ? $reported : null));
    }

    /** @param array<string, mixed> $payload */
    private function handleRelayEvent(Inbox $inbox, array $payload): void
    {
        $eventType = (string) ($payload['event_type'] ?? '');
        $args = is_array($payload['payload'] ?? null) ? $payload['payload'] : [];

        match ($eventType) {
            'undo', 'reaction', 'old_reactions', 'seen_messages', 'delivered_messages' => $this->applyMessageEvents($inbox, $eventType, $args),
            // Gõ phím KHÔNG ghi vào tin nào, nhưng vẫn phải hiện: đẩy thẳng vào ống
            // "đang nhập…" của lõi (docs/channel-capabilities.md §2.3 `event_typing`).
            'typing' => $this->typing->handle($inbox, $args),
            // connected/upload_attachment là phù du — không có đích lưu.
            'connected', 'disconnected', 'upload_attachment' => null,
            default => Log::info('[ZALO] relay_event chưa có xử lý', ['event_type' => $eventType]),
        };
    }

    /** @param array<int|string, mixed> $args */
    private function applyMessageEvents(Inbox $inbox, string $eventType, array $args): void
    {
        foreach (RelayEventParser::events($eventType, $args) as $event) {
            $this->messageEvents->apply($inbox, $event);
        }
    }
}

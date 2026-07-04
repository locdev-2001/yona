<?php

namespace App\Modules\Integration\Chat\ZaloPersonal;

use App\Contracts\SendException;
use App\Models\Conversation;
use App\Models\Message;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\RateCapException;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\SendOutsideWindowException;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\ZaloCircuitOpenException;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\ZaloNotConnectedException;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\ZaloSplitBrainException;
use App\Modules\Integration\Contracts\ChannelDriver;

/**
 * Channel driver cho Zalo cá nhân (zca-js bridge).
 *
 * Implements ChannelDriver contract (App\Modules\Integration) — inbox core không import class này.
 * Đăng ký qua ChannelManager::extend('zalo_personal', ...) trong ZaloPersonalServiceProvider.
 *
 * D-2 (outbound/QR/send): sendMessage → ZaloSendService.
 * D-1 (inbound): parseInbound() đã đầy đủ cho webhook RLS-bind flow.
 *
 * @see ZaloPersonalServiceProvider
 * @see ChannelDriver
 */
class ZaloChannelDriver implements ChannelDriver
{
    public function __construct(private readonly ZaloSendService $sendService) {}

    public function channelKey(): string
    {
        return 'zalo_personal';
    }

    /**
     * Parse raw webhook payload từ bridge thành normalized shape cho InboundMessageService.
     *
     * Field mapping (bridge → normalized):
     *   peer_uid       = payload.peer_uid
     *   peer_name      = payload.user.name
     *   peer_avatar    = payload.user.avatar
     *   peer_phone     = null (bridge không gửi phone ở inbound — enrich async sau)
     *   direction      = payload.direction (in|out|echo; fail-safe 'in' nếu thiếu — F14)
     *   source_id      = payload.source_id
     *   type           = mapped từ inbound_kind
     *   body           = payload.content (text/caption)
     *   media_url      = payload.media_url
     *   media_meta     = {sticker, business_card, call, media_filename, ...}
     *   sender_uid     = payload.sender_uid (group sender)
     *   sender_name    = payload.sender.name
     *   platform_sent_at = payload.platform_sent_at (ms unix → Carbon)
     *   channel_account_id = payload.channel_account_id (resolved bởi webhook controller — P08)
     *   thread_type    = payload.thread_type (0=user, 1=group)
     *   channel        = 'zalo_personal'
     *
     * @param  array<string, mixed>  $raw
     * @return array<string, mixed>
     */
    public function parseInbound(array $raw): array
    {
        $inboundKind = $raw['inbound_kind'] ?? 'text';

        $type = match ($inboundKind) {
            'text' => 'text',
            'image' => 'image',
            'gif' => 'gif',
            'video' => 'video',
            'audio' => 'audio',
            'file' => 'file',
            'sticker' => 'sticker',
            'business_card' => 'business_card',
            'call' => 'call',
            default => 'text',
        };

        $mediaMeta = [];
        if (isset($raw['sticker'])) {
            $mediaMeta['sticker'] = $raw['sticker'];
        }
        if (isset($raw['business_card'])) {
            $mediaMeta['business_card'] = $raw['business_card'];
        }
        if (isset($raw['call'])) {
            $mediaMeta['call'] = $raw['call'];
        }
        if (isset($raw['media_filename'])) {
            $mediaMeta['media_filename'] = $raw['media_filename'];
        }
        if (isset($raw['quote'])) {
            $mediaMeta['quote'] = $raw['quote'];
        }

        // platform_sent_at: bridge gửi Unix ms → convert sang Carbon-friendly timestamp
        $platformSentAtMs = isset($raw['platform_sent_at']) ? (int) $raw['platform_sent_at'] : null;
        $platformSentAt = $platformSentAtMs ? date('Y-m-d H:i:s', (int) ($platformSentAtMs / 1000)) : null;

        // direction: F14 fail-safe — default 'in' nếu thiếu field
        $direction = $raw['direction'] ?? 'in';
        if (! in_array($direction, ['in', 'out', 'echo'], true)) {
            $direction = 'in'; // ponytail: fail-safe under-count billing an toàn hơn over-count
        }

        $user = $raw['user'] ?? [];
        $sender = $raw['sender'] ?? null;

        return [
            'channel' => 'zalo_personal',
            // P08: key duy nhất cho upsertConversation — resolved bởi webhook controller
            // (channel_account_id ổn định qua reconnect, thay vì connection_id/personal_uid).
            'channel_account_id' => isset($raw['channel_account_id']) && $raw['channel_account_id'] !== ''
                ? (string) $raw['channel_account_id']
                : null,
            'peer_uid' => (string) ($raw['peer_uid'] ?? ''),
            'peer_name' => $user['name'] ?? null,
            'peer_avatar' => $user['avatar'] ?? null,
            'peer_phone' => null, // enrich async khi có business_card.phone
            'thread_type' => isset($raw['thread_type']) ? (int) $raw['thread_type'] : 0,
            'direction' => $direction,
            'source_id' => isset($raw['source_id']) ? (string) $raw['source_id'] : null,
            'type' => $type,
            'body' => isset($raw['content']) ? (string) $raw['content'] : null,
            'media_url' => $raw['media_url'] ?? null,
            'media_meta' => $mediaMeta,
            'platform_sent_at' => $platformSentAt,
            'sender_uid' => $raw['sender_uid'] ?? ($sender['id'] ?? null),
            'sender_name' => $sender['name'] ?? null,
            'sent_by' => null, // inbound = ngoài hệ thống
            'platform_meta' => $this->extractPlatformMeta($raw),
        ];
    }

    /**
     * P01a — platform_meta.zca_message: subset raw từ listener_data đủ 15 key
     * (13 từ listener_data + threadId/threadType) cho outbound action
     * (quote/reaction/seen — Codex BLOCKER-1). Thiếu 1 field = action tương ứng
     * KHÔNG gọi được → chỉ giữ field có mặt, P06 gate theo field.
     * Tin backfill/legacy không có listener_data → platform_meta rỗng (action disable).
     *
     * @param  array<string, mixed>  $raw
     * @return array<string, mixed>
     */
    private function extractPlatformMeta(array $raw): array
    {
        $listenerData = $raw['listener_data'] ?? null;
        if (! is_array($listenerData)) {
            return [];
        }

        $zcaFields = [
            'msgId', 'cliMsgId', 'uidFrom', 'idTo', 'msgType', 'ts', 'ttl',
            'content', 'propertyExt', 'st', 'at', 'cmd', 'realMsgId',
        ];

        $zcaMessage = array_intersect_key($listenerData, array_flip($zcaFields));

        if (isset($raw['thread_id'])) {
            $zcaMessage['threadId'] = (string) $raw['thread_id'];
        }
        if (isset($raw['thread_type'])) {
            $zcaMessage['threadType'] = (int) $raw['thread_type'];
        }

        return $zcaMessage === [] ? [] : ['zca_message' => $zcaMessage];
    }

    /**
     * Gửi tin outbound qua ZaloSendService.
     * Wrap Zalo-specific exceptions thành SendException (inbox-agnostic)
     * để InboxController không cần import ChannelZalo exceptions (N1).
     *
     * @param  array<string, mixed>  $payload  {text?, media?}
     *
     * @throws SendException
     */
    public function sendMessage(Conversation $conversation, array $payload): Message
    {
        try {
            return $this->sendService->send(
                conversation: $conversation,
                text: isset($payload['text']) ? (string) $payload['text'] : null,
                media: $payload['media'] ?? null,
            );
        } catch (ZaloCircuitOpenException $e) {
            throw new SendException('Kết nối Zalo đang lỗi. Vui lòng gửi tin tay hoặc thử lại sau.', 'circuit_open', $e);
        } catch (SendOutsideWindowException $e) {
            throw new SendException('Chỉ được gửi tin từ 7h–22h (ToS Zalo).', 'outside_window', $e);
        } catch (RateCapException $e) {
            throw new SendException('Đã gửi tối đa 3 tin quảng cáo trong ngày cho số này (ToS Zalo).', 'rate_cap', $e);
        } catch (ZaloNotConnectedException $e) {
            throw new SendException('Zalo chưa kết nối hoặc phiên đã hết. Vui lòng đăng nhập lại.', 'not_connected', $e);
        } catch (ZaloSplitBrainException $e) {
            throw new SendException('Phát hiện nhiều phiên Zalo cùng kết nối — đã dừng gửi để tránh gửi nhầm. Liên hệ hỗ trợ.', 'split_brain', $e);
        }
    }

    public function connect(string $workspaceId, array $params): void
    {
        // QR flow quản lý qua ZaloConnectionController — không cần impl ở đây
    }

    public function disconnect(string $workspaceId): void
    {
        // Logout qua ZaloConnectionController::destroy — không cần impl ở đây
    }
}

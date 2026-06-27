<?php

namespace Modules\ChannelZalo\Services;

use Modules\Inbox\Contracts\ChannelDriver;
use Modules\Inbox\Models\Conversation;
use Modules\Inbox\Models\Message;

/**
 * Channel driver cho Zalo cá nhân (zca-js bridge).
 *
 * Implements ChannelDriver contract (inbox) — inbox core không import class này.
 * Đăng ký qua ChannelManager::extend('zalo_personal', ...) trong ChannelZaloServiceProvider.
 *
 * D-2 (outbound/QR/send): sendMessage → ZaloSendService.
 * D-1 (inbound): parseInbound() đã đầy đủ cho webhook RLS-bind flow.
 *
 * @see modules/channel-zalo/src/Providers/ChannelZaloServiceProvider.php
 * @see modules/inbox/src/Contracts/ChannelDriver.php
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
     *   zalo_connection_id = payload.connection_id
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
            'text'          => 'text',
            'image'         => 'image',
            'gif'           => 'gif',
            'video'         => 'video',
            'audio'         => 'audio',
            'file'          => 'file',
            'sticker'       => 'sticker',
            'business_card' => 'business_card',
            'call'          => 'call',
            default         => 'text',
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
            'channel'            => 'zalo_personal',
            'zalo_connection_id' => isset($raw['connection_id']) ? (int) $raw['connection_id'] : null,
            'peer_uid'           => (string) ($raw['peer_uid'] ?? ''),
            'peer_name'          => $user['name'] ?? null,
            'peer_avatar'        => $user['avatar'] ?? null,
            'peer_phone'         => null, // enrich async khi có business_card.phone
            'thread_type'        => isset($raw['thread_type']) ? (int) $raw['thread_type'] : 0,
            'direction'          => $direction,
            'source_id'          => isset($raw['source_id']) ? (string) $raw['source_id'] : null,
            'type'               => $type,
            'body'               => isset($raw['content']) ? (string) $raw['content'] : null,
            'media_url'          => $raw['media_url'] ?? null,
            'media_meta'         => $mediaMeta,
            'platform_sent_at'   => $platformSentAt,
            'sender_uid'         => $raw['sender_uid'] ?? ($sender['id'] ?? null),
            'sender_name'        => $sender['name'] ?? null,
            'sent_by'            => null, // inbound = ngoài hệ thống
        ];
    }

    /**
     * Gửi tin outbound qua ZaloSendService (bridge HTTP + metering + rate-limit + circuit-breaker).
     *
     * Contract trả void; ZaloSendService::send() trả Message (dùng qua inject trực tiếp nếu cần Message).
     *
     * @param  array<string, mixed>  $payload  {text?, media?}
     */
    public function sendMessage(Conversation $conversation, array $payload): void
    {
        $this->sendService->send(
            conversation: $conversation,
            text: isset($payload['text']) ? (string) $payload['text'] : null,
            media: $payload['media'] ?? null,
        );
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

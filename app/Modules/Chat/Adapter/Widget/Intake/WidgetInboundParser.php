<?php

namespace App\Modules\Chat\Adapter\Widget\Intake;

use App\Models\Conversation;
use App\Modules\Chat\Adapter\Widget\WidgetChannelDriver;
use App\Modules\Chat\Delivery\Event\OutboundEvent;

/**
 * Dịch payload vào của kênh nội bộ sang shape chuẩn của `IntakeService`.
 *
 * Kênh nội bộ không có "định dạng nhà cung cấp" nào để dịch — nhưng vẫn đi qua
 * lớp dịch như mọi adapter khác. Cho nó một đường riêng vì "đằng nào cũng đúng
 * shape rồi" là mở ra đường ingest thứ hai, và đường thứ hai luôn lệch dần khỏi
 * đường thứ nhất.
 */
class WidgetInboundParser
{
    /**
     * @param  array<string, mixed>  $raw
     * @return array<string, mixed>
     */
    public function parse(array $raw): array
    {
        $events = OutboundEvent::listFromArray((array) ($raw['events'] ?? []));
        $body = $raw['body'] ?? ($events === [] ? null : OutboundEvent::flatten($events));

        return [
            'channel' => WidgetChannelDriver::KEY,
            'channel_account_id' => isset($raw['channel_account_id']) && $raw['channel_account_id'] !== ''
                ? (string) $raw['channel_account_id']
                : null,
            'thread_uid' => (string) ($raw['visitor_id'] ?? $raw['sender_uid'] ?? ''),
            'thread_name' => $raw['visitor_name'] ?? null,
            'thread_avatar' => null,
            'sender_phone' => null,
            'thread_kind' => Conversation::KIND_DIRECT, // kênh nội bộ chỉ có 1-1
            'direction' => 'in',
            'source_id' => isset($raw['source_id']) ? (string) $raw['source_id'] : null,
            'type' => (string) ($raw['type'] ?? 'text'),
            'body' => $body === null ? null : (string) $body,
            'media_url' => $raw['media_url'] ?? null,
            'media_meta' => (array) ($raw['media_meta'] ?? []),
            'platform_sent_at' => $raw['sent_at'] ?? null,
            'sender_uid' => null,
            'sender_name' => null,
            'sent_by' => null,
            // Không có ruột nền tảng để giữ — kênh này KHÔNG có nền tảng nào.
            'platform_meta' => [],
        ];
    }
}

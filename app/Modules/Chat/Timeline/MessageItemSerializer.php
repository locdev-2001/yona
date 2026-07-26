<?php

namespace App\Modules\Chat\Timeline;

use App\Models\Message;

/**
 * Shape DUY NHẤT của message item phía FE (StreamItem) — dùng chung cho:
 *  - GET stream (ConversationStreamController, từ DB row)
 *  - broadcast MessageReceived (từ model)
 *  - response POST inbox.send (từ model — FE append tại chỗ, không reload thread)
 *
 * Đổi shape = sửa 1 file này. KHÔNG expose platform_meta thô — FE chỉ cần
 * flag `quotable` (tin có meta mới quote/react được).
 */
final class MessageItemSerializer
{
    /**
     * @param  list<array{reactor_uid: string, icon: string, reacted_at: string}>  $reactions
     * @return array<string, mixed>
     */
    public static function fromModel(Message $message, array $reactions = []): array
    {
        return [
            'item_type' => 'message',
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'direction' => $message->direction,
            'type' => $message->type,
            'body' => $message->body,
            'media_url' => $message->media_url,
            'media_meta' => $message->media_meta,
            'source_id' => $message->source_id,
            // Khớp stream_at của GET stream: COALESCE(platform_sent_at, created_at)
            'platform_sent_at' => ($message->platform_sent_at ?? $message->created_at)->toIso8601String(),
            'sender_uid' => $message->sender_uid,
            'sender_name' => $message->sender_name,
            'sent_by' => $message->sent_by,
            'created_at' => $message->created_at->toIso8601String(),
            'recalled_at' => $message->recalled_at?->toIso8601String(),
            'delivered_at' => $message->delivered_at?->toIso8601String(),
            'seen_at' => $message->seen_at?->toIso8601String(),
            'reactions' => $reactions,
            'quotable' => ! empty($message->platform_meta),
        ];
    }

    /**
     * Row từ query stream (fetchMessageItems) — stream_at đã COALESCE sẵn trong SQL.
     *
     * @param  list<array{reactor_uid: string, icon: string, reacted_at: string}>  $reactions
     * @return array<string, mixed>
     */
    public static function fromRow(object $row, array $reactions = []): array
    {
        return [
            'item_type' => 'message',
            'id' => $row->id,
            'conversation_id' => $row->conversation_id,
            'direction' => $row->direction,
            'type' => $row->type,
            'body' => $row->body,
            'media_url' => $row->media_url,
            'media_meta' => $row->media_meta === null ? null : json_decode((string) $row->media_meta, true),
            'source_id' => $row->source_id,
            'platform_sent_at' => $row->stream_at,
            'sender_uid' => $row->sender_uid,
            'sender_name' => $row->sender_name,
            'sent_by' => $row->sent_by,
            'created_at' => $row->created_at,
            'recalled_at' => $row->recalled_at,
            'delivered_at' => $row->delivered_at,
            'seen_at' => $row->seen_at,
            'reactions' => $reactions,
            'quotable' => self::hasPlatformMeta($row->platform_meta ?? null),
        ];
    }

    private static function hasPlatformMeta(?string $platformMeta): bool
    {
        if ($platformMeta === null || $platformMeta === '' || $platformMeta === '{}') {
            return false;
        }

        $decoded = json_decode($platformMeta, true);

        return is_array($decoded) && $decoded !== [];
    }
}

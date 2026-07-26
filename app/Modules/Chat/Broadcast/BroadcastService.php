<?php

namespace App\Modules\Chat\Broadcast;

use App\Events\MessageReceived;
use App\Models\Conversation;
use App\Models\Message;

/**
 * Bước công bố sau khi Message đã persist — dùng chung mọi kênh, mọi hướng:
 * cập nhật cache hội thoại (last_message_at/preview, unread inbound) rồi
 * broadcast MessageReceived. Inbound (IntakeService) và outbound
 * (DeliveryPipeline) cùng đi qua đây → FE thấy tin realtime + convList
 * đúng thứ tự + stream_version sync (P09) không phân biệt hướng.
 */
class BroadcastService
{
    /** @param array<string, mixed>|null $gapEvent */
    public function publish(Conversation $conversation, Message $message, string $direction, ?array $gapEvent = null): void
    {
        $updates = [
            'last_message_at' => $message->platform_sent_at ?? $message->created_at,
            'last_message_preview' => $this->previewFor($message),
        ];

        if ($direction === 'in') {
            // ponytail: DB::raw để atomic increment, tránh race condition
            $conversation->increment('unread_count', 1, $updates);
        } else {
            $conversation->fill($updates)->save();
        }

        // Sync in-memory để broadcastWith() có last_message_at/stream_version mới nhất
        $conversation->refresh();

        $message->setRelation('conversation', $conversation);
        event(new MessageReceived($message, $gapEvent));
    }

    /**
     * Preview sidebar theo type — mirror messagePreview() FE (message-types.ts).
     * Sticker: body là raw platform content (JSON {id,catId,type}) → LUÔN label,
     * không bao giờ lộ JSON ra UI (bug 05/07).
     */
    private function previewFor(Message $message): string
    {
        if ($message->type === 'sticker') {
            return '[Sticker]';
        }

        $body = trim((string) ($message->body ?? ''));
        if ($body !== '') {
            return mb_substr($body, 0, 100);
        }

        return match ($message->type) {
            'image' => '[Hình ảnh]',
            'gif' => '[GIF]',
            'video' => '[Video]',
            'audio' => '[Tin nhắn thoại]',
            'file' => '[Tệp đính kèm]',
            'business_card' => '[Danh thiếp]',
            'bank_card' => '[Tài khoản ngân hàng]',
            'call' => '[Cuộc gọi]',
            default => '',
        };
    }
}

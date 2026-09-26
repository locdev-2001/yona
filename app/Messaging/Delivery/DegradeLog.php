<?php

namespace App\Messaging\Delivery;

use App\Models\Message;
use Illuminate\Support\Facades\Log;

/**
 * Ghi lại mức gửi thật của một tin có cấu trúc: `content_attributes.delivery`
 * để hộp thư hiện được sau này, và log khi có hạ cấp để dò kênh nào mất tính
 * năng nhiều nhất (docs/system-architecture.md §3).
 */
final class DegradeLog
{
    public static function record(Message $message, DeliveryLevel $level): void
    {
        if (($message->content_attributes['delivery'] ?? null) === $level->value) {
            return;
        }

        $message->update(['content_attributes' => [
            ...($message->content_attributes ?? []),
            'delivery' => $level->value,
        ]]);

        if ($level === DeliveryLevel::Native) {
            return;
        }

        Log::info('messaging.delivery.degraded', [
            'message_id' => $message->id,
            'channel' => $message->inbox?->channel_type,
            'content_type' => $message->contentTypeName(),
            'level' => $level->value,
        ]);
    }

    /**
     * Ảnh thẻ (`CardImageService`) lỗi hoặc quá giờ — tin vẫn gửi được (rơi xuống
     * `text`/`text_numbered`), chỉ ghi log để dò kênh/loại tin nào ảnh hay hỏng.
     * Không phải một `DeliveryLevel` thật nên tách khỏi `record()`.
     */
    public static function recordImageFailed(Message $message): void
    {
        Log::info('messaging.delivery.degraded', [
            'message_id' => $message->id,
            'channel' => $message->inbox?->channel_type,
            'content_type' => $message->contentTypeName(),
            'level' => 'image_failed',
        ]);
    }
}

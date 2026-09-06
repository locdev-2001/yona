<?php

namespace App\Services\Channels;

use App\Models\Message;

/**
 * `message.external_error` của Chatwoot là store_accessor trên `content_attributes`
 * (xem app/models/message.rb) chứ không phải cột riêng. Mọi driver kênh ghi lỗi
 * gửi ra ngoài qua đây để chỉ có MỘT chỗ biết chi tiết đó.
 */
class ChannelMessageStatus
{
    public static function fail(Message $message, ?string $externalError): void
    {
        $message->update([
            'status' => Message::STATUSES['failed'],
            'content_attributes' => [...$message->content_attributes ?? [], 'external_error' => $externalError],
        ]);
    }

    public static function markStatus(Message $message, string $status, ?string $externalError = null): void
    {
        $attributes = ['status' => Message::STATUSES[$status]];

        if (filled($externalError)) {
            $attributes['content_attributes'] = [...$message->content_attributes ?? [], 'external_error' => $externalError];
        }

        $message->update($attributes);
    }
}

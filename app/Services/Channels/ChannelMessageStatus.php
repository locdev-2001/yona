<?php

namespace App\Services\Channels;

use App\Models\Message;

/**
 * `message.external_error` là store_accessor trên `content_attributes`
 * (xem app/models/message.rb) chứ không phải cột riêng. Mọi driver kênh ghi lỗi
 * gửi ra ngoài qua đây để chỉ có MỘT chỗ biết chi tiết đó.
 */
class ChannelMessageStatus
{
    /**
     * `$externalError` là chuỗi ở các kênh cũ; kênh khai `outbound_retry` theo
     * docs/channel-capabilities.md §2.2 ghi mảng {code, message} để UI dịch được
     * lý do và bật nút Thử lại.
     *
     * @param  string|array<string, mixed>|null  $externalError
     */
    public static function fail(Message $message, string|array|null $externalError): void
    {
        $message->update([
            'status' => Message::STATUSES['failed'],
            'content_attributes' => [...$message->content_attributes ?? [], 'external_error' => $externalError],
        ]);
    }

    /** @param string|array<string, mixed>|null $externalError */
    public static function markStatus(Message $message, string $status, string|array|null $externalError = null): void
    {
        $attributes = ['status' => Message::STATUSES[$status]];

        if (filled($externalError)) {
            $attributes['content_attributes'] = [...$message->content_attributes ?? [], 'external_error' => $externalError];
        }

        $message->update($attributes);
    }
}

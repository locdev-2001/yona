<?php

namespace App\Services\Facebook\Concerns;

/**
 * Trả lời trích dẫn qua Send API của Messenger (Instagram dùng cùng định dạng):
 * `reply_to.mid` nằm ở CẤP GỐC body, cạnh `recipient` và `message`. `mid` là
 * source_id của tin gốc, lõi đã đặt ở `content_attributes.in_reply_to_external_id`.
 *
 * @see https://developers.facebook.com/documentation/business-messaging/messenger-platform/send-messages
 */
trait BuildsMessengerReplyTo
{
    /** @return array{reply_to?: array{mid: string}} */
    private function messengerReplyTo(): array
    {
        $repliedMid = $this->message->content_attributes['in_reply_to_external_id'] ?? null;

        return filled($repliedMid) ? ['reply_to' => ['mid' => (string) $repliedMid]] : [];
    }

    /**
     * Một tin của Yona có thể thành nhiều lượt gọi Send API (chữ + từng tệp);
     * chỉ lượt đầu mang trích dẫn để khách không thấy cùng một trích dẫn lặp lại.
     *
     * @param  list<array<string, mixed>>  $payloads
     * @return list<array<string, mixed>>
     */
    private function withMessengerReplyToOnFirst(array $payloads): array
    {
        if ($payloads === []) {
            return [];
        }

        $payloads[0] = [...$payloads[0], ...$this->messengerReplyTo()];

        return $payloads;
    }
}

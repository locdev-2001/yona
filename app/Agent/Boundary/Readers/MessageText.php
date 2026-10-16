<?php

namespace App\Agent\Boundary\Readers;

use App\Messaging\Delivery\NumberedChoices;
use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\Conversation;
use App\Models\Message;

// Chữ của một tin lõi cho mô hình đọc. Tin có cấu trúc (thẻ sản phẩm, đơn đặt mua của
// khách, chuyển khoản, trả lời nhanh…) hạ thành đúng bản chữ mà khách trên kênh chỉ có chữ
// nhận được, kèm danh sách lựa chọn đánh số (khách Zalo trả lời bằng số).
final class MessageText
{
    public function __construct(private readonly StructuredTypeRegistry $structuredTypes) {}

    public function of(Message $message, Conversation $conversation): ?string
    {
        $text = blank($message->content) ? null : (string) $message->content;
        $type = $this->structuredTypes->for($message->contentTypeName());

        if ($type === null) {
            return $text;
        }

        $message->setRelation('conversation', $conversation);
        $attributes = $this->structuredTypes->read($message);

        if ($attributes === null) {
            return $text;
        }

        $rendered = $conversation->inAccountLocale(function () use ($type, $message, $attributes) {
            $choices = $type->choices($attributes);
            $plain = $type->plainText($message->content, $attributes);

            return trim($choices === [] ? $plain : $plain."\n".NumberedChoices::render($choices));
        });

        return $rendered === '' ? $text : $rendered;
    }
}

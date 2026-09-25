<?php

namespace App\Messaging\Structured;

use App\Models\Conversation;

/** Thứ loại tin cần biết khi chuẩn hoá mà payload không tự mang (vd tin gốc của yêu cầu đặt hàng). */
final readonly class PayloadContext
{
    public function __construct(
        public Conversation $conversation,
        public int $messageType,
    ) {}
}

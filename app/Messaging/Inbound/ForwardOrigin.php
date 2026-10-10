<?php

namespace App\Messaging\Inbound;

/** Khách chuyển tiếp một tin từ nơi khác trên nền tảng; tên người gửi gốc là tuỳ chọn. */
final class ForwardOrigin
{
    public function __construct(public readonly ?string $senderName = null) {}

    /** @return array{origin: string, sender_name?: string} */
    public function payload(): array
    {
        return array_filter(['origin' => 'channel', 'sender_name' => $this->senderName], fn ($value) => filled($value));
    }
}

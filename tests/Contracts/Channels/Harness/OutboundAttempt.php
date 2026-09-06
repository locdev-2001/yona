<?php

namespace Tests\Contracts\Channels\Harness;

use App\Models\Message;

/** Kết quả một lần gửi ra: tin trong lõi + các payload đã bắn tới nhà cung cấp. */
final class OutboundAttempt
{
    /** @param list<array<string, mixed>> $providerPayloads */
    public function __construct(
        public readonly Message $message,
        public readonly array $providerPayloads,
    ) {}

    /**
     * Toàn bộ payload dẹt thành một chuỗi để contract tìm tham chiếu mà không cần
     * biết tên khoá của kênh. Bỏ cả dấu escape của JSON lồng trong JSON (Telegram
     * nhét mảng media dưới dạng chuỗi) để so khớp URL không phụ thuộc cách đóng gói.
     */
    public function flattened(): string
    {
        $encoded = json_encode($this->providerPayloads, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '';

        return str_replace('\\', '', $encoded);
    }
}

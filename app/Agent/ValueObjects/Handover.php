<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// Nội dung bàn giao hội thoại cho người.
final readonly class Handover
{
    public function __construct(
        public HandoffReason $reason,
        // Ghi chú cho nhân viên do mô hình viết; null = chữ mặc định theo lý do.
        public ?string $note,
        // Câu khách hỏi mà AI chưa trả lời được (các tin khách của lượt).
        public ?string $customerQuestion,
    ) {
        if ($note !== null && trim($note) === '') {
            throw new InvalidArgumentException('Handover note must be null or non-empty.');
        }
    }
}

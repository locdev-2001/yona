<?php

namespace App\Agent\ValueObjects;

use DateTimeImmutable;
use InvalidArgumentException;

final readonly class ModelRequest
{
    public function __construct(
        public int $accountId,
        public Prompt $prompt,
        // Hạn chót tuyệt đối của lời gọi (gồm cả thử lại, dự phòng).
        public DateTimeImmutable $deadline,
        // Khoá ổn định theo nhân viên AI, cho nhà cung cấp có cache tự động.
        public string $cacheKey,
        // null = cổng tự chọn: mô hình riêng của nhân viên AI, không có thì mặc định.
        public ?string $modelAlias = null,
        public ?int $agentMemberId = null,
    ) {
        if ($accountId <= 0 || $cacheKey === '') {
            throw new InvalidArgumentException('Model request needs an account and a cache key.');
        }
    }
}

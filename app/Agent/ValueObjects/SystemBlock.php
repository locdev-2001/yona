<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// Một khối chỉ dẫn hệ thống. `cacheable` = khối ổn định giữa các lượt, được đặt điểm
// ngắt cache ở cuối khối cacheable sau cùng.
final readonly class SystemBlock
{
    public function __construct(
        public string $text,
        public bool $cacheable = true,
    ) {
        if (trim($text) === '') {
            throw new InvalidArgumentException('System block must not be empty.');
        }
    }
}

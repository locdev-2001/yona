<?php

namespace App\Agent\ValueObjects;

use DateTimeImmutable;

// Phần biến động của lượt đưa vào prompt (khối C): giờ địa phương của inbox, kênh,
// cửa sổ trả lời của kênh. Chốt một lần đầu lượt để các bước trong lượt trùng byte.
final readonly class TurnSituation
{
    public function __construct(
        public DateTimeImmutable $now,
        public string $timezone,
        public string $channel,
        public bool $canReply,
    ) {}
}

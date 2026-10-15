<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// Số đo một hoặc nhiều lời gọi mô hình. Chi phí tính bằng micro-USD (1 USD = 1_000_000).
final readonly class Usage
{
    public function __construct(
        public int $inputTokens = 0,
        public int $outputTokens = 0,
        public int $cacheReadTokens = 0,
        public int $cacheWriteTokens = 0,
        public int $costMicroUsd = 0,
        public int $latencyMs = 0,
        // Vì sao cache không trúng (vd `route_changed`); null khi không biết hoặc đã trúng.
        public ?string $cacheMissReason = null,
    ) {
        foreach ([$inputTokens, $outputTokens, $cacheReadTokens, $cacheWriteTokens, $costMicroUsd, $latencyMs] as $value) {
            if ($value < 0) {
                throw new InvalidArgumentException('Usage counters must not be negative.');
            }
        }
    }

    public static function zero(): self
    {
        return new self;
    }

    // Cộng dồn qua các bước của một lượt; lý do trượt cache giữ của lần gọi sau cùng.
    public function plus(self $other): self
    {
        return new self(
            $this->inputTokens + $other->inputTokens,
            $this->outputTokens + $other->outputTokens,
            $this->cacheReadTokens + $other->cacheReadTokens,
            $this->cacheWriteTokens + $other->cacheWriteTokens,
            $this->costMicroUsd + $other->costMicroUsd,
            $this->latencyMs + $other->latencyMs,
            $other->cacheMissReason ?? $this->cacheMissReason,
        );
    }
}

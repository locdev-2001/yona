<?php

namespace App\Agent\Inference\Gateway;

use App\Agent\ValueObjects\Usage;
use InvalidArgumentException;

// Đơn giá USD cho mỗi triệu token. 1 token ở giá X USD/MTok = X micro-USD.
final readonly class ModelPrice
{
    public function __construct(
        public float $input = 0.0,
        public float $output = 0.0,
        public float $cacheRead = 0.0,
        public float $cacheWrite = 0.0,
    ) {
        foreach ([$input, $output, $cacheRead, $cacheWrite] as $price) {
            if ($price < 0) {
                throw new InvalidArgumentException('Model prices must not be negative.');
            }
        }
    }

    /** @param array<string, mixed> $config */
    public static function fromConfig(array $config): self
    {
        return new self(
            (float) ($config['input'] ?? 0),
            (float) ($config['output'] ?? 0),
            (float) ($config['cache_read'] ?? 0),
            (float) ($config['cache_write'] ?? 0),
        );
    }

    public function costMicroUsd(Usage $usage): int
    {
        return (int) round(
            $usage->inputTokens * $this->input
            + $usage->outputTokens * $this->output
            + $usage->cacheReadTokens * $this->cacheRead
            + $usage->cacheWriteTokens * $this->cacheWrite
        );
    }
}

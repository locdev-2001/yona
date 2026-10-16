<?php

namespace App\Agent\Evals;

// Một lượt AI trong kịch bản: tin khách tới lúc mọi job agent xong (đồng hồ thật), và AI
// có gửi tin công khai cho khách hay không.
final readonly class TurnMeasure
{
    public function __construct(
        public int $latencyMs,
        public bool $replied,
    ) {}

    /** @return array{latency_ms: int, replied: bool} */
    public function toArray(): array
    {
        return ['latency_ms' => $this->latencyMs, 'replied' => $this->replied];
    }

    /** @param array<string, mixed> $raw */
    public static function fromArray(array $raw): self
    {
        return new self((int) ($raw['latency_ms'] ?? 0), (bool) ($raw['replied'] ?? false));
    }
}

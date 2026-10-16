<?php

namespace App\Agent\Evals;

// Giám khảo chấm một tiêu chí riêng của kịch bản.
final readonly class CriterionResult
{
    public function __construct(
        public string $id,
        public string $text,
        public bool $passed,
        public string $reason,
    ) {}

    /** @return array{id: string, text: string, passed: bool, reason: string} */
    public function toArray(): array
    {
        return ['id' => $this->id, 'text' => $this->text, 'passed' => $this->passed, 'reason' => $this->reason];
    }

    /** @param array<string, mixed> $raw */
    public static function fromArray(array $raw): self
    {
        return new self((string) ($raw['id'] ?? ''), (string) ($raw['text'] ?? ''), (bool) ($raw['passed'] ?? false), (string) ($raw['reason'] ?? ''));
    }
}

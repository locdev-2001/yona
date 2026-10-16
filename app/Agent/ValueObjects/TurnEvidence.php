<?php

namespace App\Agent\ValueObjects;

// Kết quả tra cứu (tool_result đã tuần tự hoá) của một lượt: tham chiếu tri thức mô hình
// trích trong câu trả lời phải có ở đây.
final readonly class TurnEvidence
{
    /** @param  list<string>  $toolResults */
    public function __construct(
        public array $toolResults = [],
    ) {}

    public function with(string $toolResult): self
    {
        return new self([...$this->toolResults, $toolResult]);
    }

    public function mentions(string $needle): bool
    {
        foreach ($this->toolResults as $toolResult) {
            if (str_contains($toolResult, $needle)) {
                return true;
            }
        }

        return false;
    }
}

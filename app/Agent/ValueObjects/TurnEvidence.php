<?php

namespace App\Agent\ValueObjects;

// Mọi tool_result (đã tuần tự hoá) của lượt đang chạy: nguồn duy nhất cho phép khẳng
// định ràng buộc. Lời khách và lịch sử hội thoại không nằm ở đây.
final readonly class TurnEvidence
{
    /** @param list<string> $toolResults */
    public function __construct(public array $toolResults = []) {}

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

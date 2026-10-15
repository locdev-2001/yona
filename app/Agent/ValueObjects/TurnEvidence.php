<?php

namespace App\Agent\ValueObjects;

// Nguồn cho phép khẳng định ràng buộc trong một lượt: mọi tool_result (đã tuần tự
// hoá) của lượt, và lời nhân viên người đã nói công khai trong lịch sử đã nạp. Lời
// khách và lời của chính AI không bao giờ nằm ở đây.
final readonly class TurnEvidence
{
    /**
     * @param  list<string>  $toolResults
     * @param  list<string>  $staffStatements
     */
    public function __construct(
        public array $toolResults = [],
        public array $staffStatements = [],
    ) {}

    public function with(string $toolResult): self
    {
        return new self([...$this->toolResults, $toolResult], $this->staffStatements);
    }

    // Tham chiếu tri thức chỉ có trong kết quả tra cứu của lượt.
    public function mentions(string $needle): bool
    {
        foreach ($this->toolResults as $toolResult) {
            if (str_contains($toolResult, $needle)) {
                return true;
            }
        }

        return false;
    }

    /** @return list<string> */
    public function sources(): array
    {
        return [...$this->toolResults, ...$this->staffStatements];
    }
}

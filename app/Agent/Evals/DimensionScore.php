<?php

namespace App\Agent\Evals;

use InvalidArgumentException;

// Điểm một tiêu chí chung của thang chấm; null = không áp dụng cho kịch bản này.
final readonly class DimensionScore
{
    public function __construct(
        public string $dimension,
        public ?int $score,
        public string $reason,
    ) {
        if ($score !== null && ($score < Rubric::MIN_SCORE || $score > Rubric::MAX_SCORE)) {
            throw new InvalidArgumentException("Score of `{$dimension}` must be between ".Rubric::MIN_SCORE.' and '.Rubric::MAX_SCORE.'.');
        }
    }

    /** @return array{score: ?int, reason: string} */
    public function toArray(): array
    {
        return ['score' => $this->score, 'reason' => $this->reason];
    }
}

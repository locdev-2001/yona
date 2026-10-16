<?php

namespace App\Agent\Evals;

// Chênh lệch giữa hai vòng chấm, đọc từ phần `scorecard` của results.json mỗi vòng.
final readonly class Comparison
{
    /**
     * @param  list<array{label: string, previous: ?float, current: ?float, decimals: int}>  $metrics
     * @param  list<array{scenario: string, previous: ?float, current: ?float, previous_pass: ?float, current_pass: ?float}>  $scenarios
     */
    public function __construct(
        public string $previousLabel,
        public array $metrics,
        public array $scenarios,
    ) {}

    /**
     * @param  array<string, mixed>  $current  scorecard của vòng này
     * @param  array<string, mixed>  $previous  scorecard của vòng trước
     */
    public static function between(array $current, array $previous, string $previousLabel): self
    {
        $metrics = [
            ['label' => 'Điểm trung bình chung', 'previous' => self::number($previous['overall_mean'] ?? null), 'current' => self::number($current['overall_mean'] ?? null), 'decimals' => 2],
        ];

        foreach (Rubric::dimensionIds() as $dimension) {
            $metrics[] = [
                'label' => Rubric::label($dimension),
                'previous' => self::number($previous['dimension_means'][$dimension] ?? null),
                'current' => self::number($current['dimension_means'][$dimension] ?? null),
                'decimals' => 2,
            ];
        }

        $metrics[] = ['label' => 'Tỉ lệ đạt tiêu chí riêng (%)', 'previous' => self::percent($previous['criteria_pass_rate'] ?? null), 'current' => self::percent($current['criteria_pass_rate'] ?? null), 'decimals' => 1];
        $metrics[] = ['label' => 'Độ trễ trung bình mỗi lượt (giây)', 'previous' => self::seconds($previous['average_turn_latency_ms'] ?? null), 'current' => self::seconds($current['average_turn_latency_ms'] ?? null), 'decimals' => 1];
        $metrics[] = ['label' => 'Chi phí AI (USD)', 'previous' => self::usd($previous['ai_cost_micro_usd'] ?? null), 'current' => self::usd($current['ai_cost_micro_usd'] ?? null), 'decimals' => 4];

        $scenarios = [];
        $previousScenarios = (array) ($previous['scenarios'] ?? []);

        foreach ((array) ($current['scenarios'] ?? []) as $scenarioId => $summary) {
            $before = (array) ($previousScenarios[$scenarioId] ?? []);
            $scenarios[] = [
                'scenario' => (string) $scenarioId,
                'previous' => self::number($before['mean'] ?? null),
                'current' => self::number(((array) $summary)['mean'] ?? null),
                'previous_pass' => self::passRate($before),
                'current_pass' => self::passRate((array) $summary),
            ];
        }

        return new self($previousLabel, $metrics, $scenarios);
    }

    public static function delta(?float $previous, ?float $current): ?float
    {
        return $previous === null || $current === null ? null : $current - $previous;
    }

    private static function number(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private static function percent(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value * 100 : null;
    }

    private static function seconds(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value / 1000 : null;
    }

    private static function usd(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value / 1_000_000 : null;
    }

    /** @param array<string, mixed> $summary */
    private static function passRate(array $summary): ?float
    {
        $total = (int) ($summary['criteria_total'] ?? 0);

        return $total === 0 ? null : 100 * (int) ($summary['criteria_passed'] ?? 0) / $total;
    }
}

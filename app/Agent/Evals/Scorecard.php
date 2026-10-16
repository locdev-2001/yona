<?php

namespace App\Agent\Evals;

// Tổng hợp một vòng chấm: điểm trung bình từng tiêu chí chung, tỉ lệ đạt tiêu chí riêng,
// cách kết thúc, chi phí và độ trễ. Lần chạy hỏng (lỗi bộ chấm) đếm riêng, không kéo điểm.
final readonly class Scorecard
{
    /**
     * @param  array<string, ?float>  $dimensionMeans
     * @param  array<string, int>  $outcomes
     * @param  array<string, array{title: string, runs: int, mean: ?float, criteria_passed: int, criteria_total: int, passed_runs: int}>  $scenarios
     */
    public function __construct(
        public int $runs,
        public int $judgedRuns,
        public array $dimensionMeans,
        public ?float $overallMean,
        public int $criteriaPassed,
        public int $criteriaTotal,
        public int $passedRuns,
        public array $outcomes,
        public int $aiCostMicroUsd,
        public int $evalCostMicroUsd,
        public int $aiTurns,
        public ?float $averageTurnLatencyMs,
        public array $scenarios,
    ) {}

    /** @param list<ScenarioRun> $runs */
    public static function of(array $runs): self
    {
        $judged = array_values(array_filter($runs, fn (ScenarioRun $run) => $run->verdict !== null));
        $dimensionMeans = [];

        foreach (Rubric::dimensionIds() as $dimension) {
            $dimensionMeans[$dimension] = self::mean(array_map(fn (ScenarioRun $run) => $run->verdict?->scores[$dimension]->score ?? null, $judged));
        }

        $criteria = array_merge(...array_map(fn (ScenarioRun $run) => $run->verdict->criteria ?? [], $judged));
        $turns = array_merge(...array_map(fn (ScenarioRun $run) => $run->turns, $runs));
        $outcomes = [];

        foreach ($runs as $run) {
            $outcomes[$run->outcome->value] = ($outcomes[$run->outcome->value] ?? 0) + 1;
        }

        return new self(
            runs: count($runs),
            judgedRuns: count($judged),
            dimensionMeans: $dimensionMeans,
            overallMean: self::mean(array_values($dimensionMeans)),
            criteriaPassed: count(array_filter($criteria, fn (CriterionResult $criterion) => $criterion->passed)),
            criteriaTotal: count($criteria),
            passedRuns: count(array_filter($judged, fn (ScenarioRun $run) => $run->verdict?->passedAll() === true)),
            outcomes: $outcomes,
            aiCostMicroUsd: array_sum(array_map(fn (ScenarioRun $run) => $run->aiCostMicroUsd, $runs)),
            evalCostMicroUsd: array_sum(array_map(fn (ScenarioRun $run) => $run->evalCostMicroUsd, $runs)),
            aiTurns: count($turns),
            averageTurnLatencyMs: self::mean(array_map(fn (TurnMeasure $turn) => (float) $turn->latencyMs, $turns)),
            scenarios: self::perScenario($runs),
        );
    }

    public function criteriaPassRate(): ?float
    {
        return $this->criteriaTotal === 0 ? null : $this->criteriaPassed / $this->criteriaTotal;
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'runs' => $this->runs,
            'judged_runs' => $this->judgedRuns,
            'dimension_means' => $this->dimensionMeans,
            'overall_mean' => $this->overallMean,
            'criteria_passed' => $this->criteriaPassed,
            'criteria_total' => $this->criteriaTotal,
            'criteria_pass_rate' => $this->criteriaPassRate(),
            'passed_runs' => $this->passedRuns,
            'outcomes' => $this->outcomes,
            'ai_cost_micro_usd' => $this->aiCostMicroUsd,
            'eval_cost_micro_usd' => $this->evalCostMicroUsd,
            'ai_turns' => $this->aiTurns,
            'average_turn_latency_ms' => $this->averageTurnLatencyMs,
            'scenarios' => $this->scenarios,
        ];
    }

    /**
     * @param  list<ScenarioRun>  $runs
     * @return array<string, array{title: string, runs: int, mean: ?float, criteria_passed: int, criteria_total: int, passed_runs: int}>
     */
    private static function perScenario(array $runs): array
    {
        $grouped = [];

        foreach ($runs as $run) {
            $grouped[$run->scenarioId][] = $run;
        }

        $summary = [];

        foreach ($grouped as $scenarioId => $scenarioRuns) {
            $criteria = array_merge(...array_map(fn (ScenarioRun $run) => $run->verdict->criteria ?? [], $scenarioRuns));
            $summary[$scenarioId] = [
                'title' => $scenarioRuns[0]->title,
                'runs' => count($scenarioRuns),
                'mean' => self::mean(array_map(fn (ScenarioRun $run) => $run->verdict?->averageScore(), $scenarioRuns)),
                'criteria_passed' => count(array_filter($criteria, fn (CriterionResult $criterion) => $criterion->passed)),
                'criteria_total' => count($criteria),
                'passed_runs' => count(array_filter($scenarioRuns, fn (ScenarioRun $run) => $run->verdict?->passedAll() === true)),
            ];
        }

        return $summary;
    }

    /** @param list<float|int|null> $values */
    private static function mean(array $values): ?float
    {
        $present = array_values(array_filter($values, fn (float|int|null $value) => $value !== null));

        return $present === [] ? null : array_sum($present) / count($present);
    }
}

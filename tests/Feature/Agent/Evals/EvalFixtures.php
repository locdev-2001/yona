<?php

namespace Tests\Feature\Agent\Evals;

use App\Agent\Evals\CriterionResult;
use App\Agent\Evals\DimensionScore;
use App\Agent\Evals\Outcome;
use App\Agent\Evals\Rubric;
use App\Agent\Evals\Scenario;
use App\Agent\Evals\ScenarioRun;
use App\Agent\Evals\Speaker;
use App\Agent\Evals\TranscriptLine;
use App\Agent\Evals\TurnMeasure;
use App\Agent\Evals\Verdict;
use DateTimeImmutable;

// Dữ liệu dựng sẵn cho test bộ chấm: kịch bản, phán quyết và lần chạy.
final class EvalFixtures
{
    /** @param array<string, mixed> $overrides */
    public static function scenarioArray(array $overrides = []): array
    {
        return [
            'id' => 'ask-price',
            'title' => 'Hỏi giá',
            'tags' => ['price'],
            'customer' => ['name' => 'Thu Trang', 'goal' => 'Biết giá váy', 'personality' => 'Dễ chịu', 'style' => 'Nhắn ngắn', 'facts' => ['chiều cao' => '1m60']],
            'opening' => 'Váy hoa nhí giá bao nhiêu ạ?',
            'max_turns' => 3,
            'criteria' => [
                ['id' => 'states-price', 'text' => 'Nêu đúng giá 189.000đ.'],
                ['id' => 'no-fake-stock', 'text' => 'Không bịa tồn kho.'],
            ],
            ...$overrides,
        ];
    }

    public static function scenario(array $overrides = []): Scenario
    {
        return Scenario::fromArray(self::scenarioArray($overrides));
    }

    /**
     * @param  array<string, ?int>  $scores  theo mã tiêu chí chung; thiếu thì 4
     * @param  array<string, bool>  $passed  theo mã tiêu chí riêng; thiếu thì đạt
     */
    public static function judgeJson(array $scores = [], array $passed = []): array
    {
        $json = ['scores' => [], 'criteria' => [], 'summary' => 'Ổn.', 'weaknesses' => [['issue' => 'Chưa mời chốt', 'quote' => 'Dạ váy giá 189.000đ ạ.']]];

        foreach (Rubric::dimensionIds() as $dimension) {
            $json['scores'][$dimension] = ['score' => array_key_exists($dimension, $scores) ? $scores[$dimension] : 4, 'reason' => "Lý do {$dimension}"];
        }

        foreach (['states-price', 'no-fake-stock'] as $id) {
            $json['criteria'][] = ['id' => $id, 'passed' => $passed[$id] ?? true, 'reason' => "Lý do {$id}"];
        }

        return $json;
    }

    public static function verdict(array $scores = [], array $passed = []): Verdict
    {
        return Verdict::fromJudgeJson(self::judgeJson($scores, $passed), self::scenario());
    }

    /** @param list<int> $latencies */
    public static function run(string $scenarioId, ?Verdict $verdict, array $latencies = [1000], Outcome $outcome = Outcome::GoalMet, int $aiCost = 1000, int $evalCost = 50_000): ScenarioRun
    {
        $at = new DateTimeImmutable('2026-10-16 09:00:00');

        return new ScenarioRun(
            scenarioId: $scenarioId,
            title: "Kịch bản {$scenarioId}",
            repeat: 1,
            conversationId: 10,
            displayId: 3,
            outcome: $outcome,
            transcript: [
                new TranscriptLine(1, Speaker::Customer, 'Váy hoa nhí giá bao nhiêu ạ?', $at),
                new TranscriptLine(2, Speaker::Ai, 'Dạ váy giá 189.000đ ạ.', $at),
                new TranscriptLine(3, Speaker::Event, 'Đã bật AI tự động', $at),
            ],
            turns: array_map(fn (int $latency) => new TurnMeasure($latency, true), $latencies),
            aiCostMicroUsd: $aiCost,
            aiModelCalls: 2,
            evalCostMicroUsd: $evalCost,
            verdict: $verdict,
            error: $verdict === null ? 'RuntimeException: judge down' : null,
        );
    }

    public static function dimensionScore(string $dimension, ?int $score): DimensionScore
    {
        return new DimensionScore($dimension, $score, '');
    }

    public static function criterion(bool $passed): CriterionResult
    {
        return new CriterionResult('x', 'x', $passed, '');
    }
}

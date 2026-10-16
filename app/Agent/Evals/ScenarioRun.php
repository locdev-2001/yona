<?php

namespace App\Agent\Evals;

// Kết quả một lần chạy một kịch bản: bản ghi hội thoại, cách kết thúc, số đo từng lượt,
// chi phí và phán quyết của giám khảo. Ghi/đọc được qua JSON để gộp và so sánh các vòng.
final readonly class ScenarioRun
{
    /**
     * @param  list<TranscriptLine>  $transcript
     * @param  list<TurnMeasure>  $turns
     */
    public function __construct(
        public string $scenarioId,
        public string $title,
        public int $repeat,
        public ?int $conversationId,
        public ?int $displayId,
        public Outcome $outcome,
        public array $transcript,
        public array $turns,
        public int $aiCostMicroUsd,
        public int $aiModelCalls,
        public int $evalCostMicroUsd,
        public ?Verdict $verdict,
        public ?string $error = null,
    ) {}

    public function averageLatencyMs(): ?float
    {
        return $this->turns === [] ? null : array_sum(array_map(fn (TurnMeasure $turn) => $turn->latencyMs, $this->turns)) / count($this->turns);
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'scenario_id' => $this->scenarioId,
            'title' => $this->title,
            'repeat' => $this->repeat,
            'conversation_id' => $this->conversationId,
            'display_id' => $this->displayId,
            'outcome' => $this->outcome->value,
            'error' => $this->error,
            'ai_cost_micro_usd' => $this->aiCostMicroUsd,
            'ai_model_calls' => $this->aiModelCalls,
            'eval_cost_micro_usd' => $this->evalCostMicroUsd,
            'turns' => array_map(fn (TurnMeasure $turn) => $turn->toArray(), $this->turns),
            'verdict' => $this->verdict?->toArray(),
            'transcript' => array_map(fn (TranscriptLine $line) => $line->toArray(), $this->transcript),
        ];
    }

    /** @param array<string, mixed> $raw */
    public static function fromArray(array $raw): self
    {
        return new self(
            scenarioId: (string) ($raw['scenario_id'] ?? ''),
            title: (string) ($raw['title'] ?? ''),
            repeat: (int) ($raw['repeat'] ?? 1),
            conversationId: isset($raw['conversation_id']) ? (int) $raw['conversation_id'] : null,
            displayId: isset($raw['display_id']) ? (int) $raw['display_id'] : null,
            outcome: Outcome::tryFrom((string) ($raw['outcome'] ?? '')) ?? Outcome::EvalError,
            transcript: array_map(fn (mixed $line) => TranscriptLine::fromArray((array) $line), array_values((array) ($raw['transcript'] ?? []))),
            turns: array_map(fn (mixed $turn) => TurnMeasure::fromArray((array) $turn), array_values((array) ($raw['turns'] ?? []))),
            aiCostMicroUsd: (int) ($raw['ai_cost_micro_usd'] ?? 0),
            aiModelCalls: (int) ($raw['ai_model_calls'] ?? 0),
            evalCostMicroUsd: (int) ($raw['eval_cost_micro_usd'] ?? 0),
            verdict: is_array($raw['verdict'] ?? null) ? Verdict::fromArray($raw['verdict']) : null,
            error: isset($raw['error']) ? (string) $raw['error'] : null,
        );
    }
}

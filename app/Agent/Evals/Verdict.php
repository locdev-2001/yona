<?php

namespace App\Agent\Evals;

use InvalidArgumentException;

// Phán quyết của giám khảo cho một lần chạy kịch bản: điểm từng tiêu chí chung, đạt/không
// từng tiêu chí riêng, nhận xét và các điểm yếu kèm trích dẫn.
final readonly class Verdict
{
    /**
     * @param  array<string, DimensionScore>  $scores  theo thứ tự của Rubric
     * @param  list<CriterionResult>  $criteria  theo thứ tự của kịch bản
     * @param  list<array{issue: string, quote: string}>  $weaknesses
     */
    public function __construct(
        public array $scores,
        public array $criteria,
        public string $summary,
        public array $weaknesses,
    ) {}

    /**
     * Đọc JSON giám khảo trả về, đối chiếu với thang chấm và tiêu chí của kịch bản: thiếu
     * tiêu chí, điểm ngoài thang hay id lạ đều ném lỗi để giám khảo chấm lại.
     *
     * @param  array<string, mixed>  $raw
     */
    public static function fromJudgeJson(array $raw, Scenario $scenario): self
    {
        $rawScores = $raw['scores'] ?? null;

        if (! is_array($rawScores)) {
            throw new InvalidArgumentException('`scores` must be an object keyed by dimension.');
        }

        $scores = [];

        foreach (Rubric::dimensionIds() as $dimension) {
            $entry = $rawScores[$dimension] ?? null;

            if (! is_array($entry) || ! array_key_exists('score', $entry)) {
                throw new InvalidArgumentException("`scores.{$dimension}` is missing.");
            }

            $score = $entry['score'];

            if ($score !== null && ! is_int($score) && ! (is_numeric($score) && (int) $score == $score)) {
                throw new InvalidArgumentException("`scores.{$dimension}.score` must be an integer or null.");
            }

            $scores[$dimension] = new DimensionScore($dimension, $score === null ? null : (int) $score, trim((string) ($entry['reason'] ?? '')));
        }

        return new self(
            $scores,
            self::criteria($raw['criteria'] ?? null, $scenario),
            trim((string) ($raw['summary'] ?? '')),
            self::weaknesses($raw['weaknesses'] ?? []),
        );
    }

    public function passedAll(): bool
    {
        foreach ($this->criteria as $criterion) {
            if (! $criterion->passed) {
                return false;
            }
        }

        return true;
    }

    // Trung bình các tiêu chí chung có điểm; null khi không tiêu chí nào áp dụng.
    public function averageScore(): ?float
    {
        $values = array_values(array_filter(array_map(fn (DimensionScore $score) => $score->score, $this->scores), fn (?int $score) => $score !== null));

        return $values === [] ? null : array_sum($values) / count($values);
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'scores' => array_map(fn (DimensionScore $score) => $score->toArray(), $this->scores),
            'criteria' => array_map(fn (CriterionResult $criterion) => $criterion->toArray(), $this->criteria),
            'summary' => $this->summary,
            'weaknesses' => $this->weaknesses,
        ];
    }

    /** @param array<string, mixed> $raw */
    public static function fromArray(array $raw): self
    {
        $scores = [];

        foreach ((array) ($raw['scores'] ?? []) as $dimension => $entry) {
            $entry = (array) $entry;
            $scores[(string) $dimension] = new DimensionScore((string) $dimension, isset($entry['score']) ? (int) $entry['score'] : null, (string) ($entry['reason'] ?? ''));
        }

        return new self(
            $scores,
            array_map(fn (mixed $criterion) => CriterionResult::fromArray((array) $criterion), array_values((array) ($raw['criteria'] ?? []))),
            (string) ($raw['summary'] ?? ''),
            self::weaknesses($raw['weaknesses'] ?? []),
        );
    }

    /** @return list<CriterionResult> */
    private static function criteria(mixed $raw, Scenario $scenario): array
    {
        if (! is_array($raw)) {
            throw new InvalidArgumentException('`criteria` must be a list.');
        }

        $byId = [];

        foreach ($raw as $entry) {
            if (is_array($entry) && isset($entry['id'])) {
                $byId[(string) $entry['id']] = $entry;
            }
        }

        $results = [];

        foreach ($scenario->criteria as $criterion) {
            $entry = $byId[$criterion->id] ?? null;

            if ($entry === null || ! is_bool($entry['passed'] ?? null)) {
                throw new InvalidArgumentException("Criterion `{$criterion->id}` needs a boolean `passed`.");
            }

            $results[] = new CriterionResult($criterion->id, $criterion->text, $entry['passed'], trim((string) ($entry['reason'] ?? '')));
        }

        return $results;
    }

    /** @return list<array{issue: string, quote: string}> */
    private static function weaknesses(mixed $raw): array
    {
        $weaknesses = [];

        foreach (is_array($raw) ? $raw : [] as $entry) {
            if (is_string($entry) && trim($entry) !== '') {
                $weaknesses[] = ['issue' => trim($entry), 'quote' => ''];
            } elseif (is_array($entry) && trim((string) ($entry['issue'] ?? '')) !== '') {
                $weaknesses[] = ['issue' => trim((string) $entry['issue']), 'quote' => trim((string) ($entry['quote'] ?? ''))];
            }
        }

        return $weaknesses;
    }
}

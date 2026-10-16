<?php

namespace App\Agent\Evals;

use InvalidArgumentException;

// Một kịch bản chấm: khách là ai, muốn gì, nhắn thế nào, câu mở đầu, trần số lượt và
// tiêu chí đạt riêng. Đọc từ tệp JSON trong scenarios/; sai hình dạng thì ném ngay.
final readonly class Scenario
{
    private const ID_PATTERN = '/^[a-z0-9][a-z0-9-]{1,63}$/';

    private const MAX_TURNS_LIMIT = 20;

    /**
     * @param  list<string>  $tags
     * @param  array<string, string>  $customerFacts  thông tin khách đưa khi được hỏi (tên, SĐT, địa chỉ, số đo…)
     * @param  list<HistoryLine>  $history  đoạn hội thoại có sẵn trước lần nhắn này
     * @param  list<Criterion>  $criteria
     */
    public function __construct(
        public string $id,
        public string $title,
        public array $tags,
        public string $customerName,
        public string $goal,
        public string $personality,
        public string $style,
        public array $customerFacts,
        public array $history,
        public string $opening,
        public int $maxTurns,
        public array $criteria,
    ) {
        if (preg_match(self::ID_PATTERN, $id) !== 1) {
            throw new InvalidArgumentException("Scenario id `{$id}` must match ".self::ID_PATTERN.'.');
        }

        if ($maxTurns < 1 || $maxTurns > self::MAX_TURNS_LIMIT) {
            throw new InvalidArgumentException("Scenario `{$id}`: max_turns must be between 1 and ".self::MAX_TURNS_LIMIT.'.');
        }

        if ($criteria === []) {
            throw new InvalidArgumentException("Scenario `{$id}` needs at least one criterion.");
        }

        $criterionIds = array_map(fn (Criterion $criterion) => $criterion->id, $criteria);

        if (count($criterionIds) !== count(array_unique($criterionIds))) {
            throw new InvalidArgumentException("Scenario `{$id}`: criterion ids must be unique.");
        }
    }

    /** @param array<string, mixed> $raw */
    public static function fromArray(array $raw): self
    {
        $id = self::text($raw, 'id', '?');
        $customer = $raw['customer'] ?? null;

        if (! is_array($customer)) {
            throw new InvalidArgumentException("Scenario `{$id}` needs a `customer` object.");
        }

        $facts = $customer['facts'] ?? [];

        if (! is_array($facts)) {
            throw new InvalidArgumentException("Scenario `{$id}`: customer.facts must be an object.");
        }

        return new self(
            id: $id,
            title: self::text($raw, 'title', $id),
            tags: array_values(array_map('strval', (array) ($raw['tags'] ?? []))),
            customerName: self::text($customer, 'name', $id),
            goal: self::text($customer, 'goal', $id),
            personality: self::text($customer, 'personality', $id),
            style: self::text($customer, 'style', $id),
            customerFacts: array_map('strval', $facts),
            history: array_map(fn (mixed $line) => HistoryLine::fromArray($line, $id), array_values((array) ($raw['history'] ?? []))),
            opening: self::text($raw, 'opening', $id),
            maxTurns: (int) ($raw['max_turns'] ?? 0),
            criteria: array_map(fn (mixed $criterion) => Criterion::fromArray($criterion, $id), array_values((array) ($raw['criteria'] ?? []))),
        );
    }

    /** @param array<string, mixed> $raw */
    private static function text(array $raw, string $key, string $scenarioId): string
    {
        $value = $raw[$key] ?? null;

        if (! is_string($value) || trim($value) === '') {
            throw new InvalidArgumentException("Scenario `{$scenarioId}` needs a non-empty `{$key}`.");
        }

        return trim($value);
    }
}

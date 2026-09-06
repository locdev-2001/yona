<?php

namespace App\Services\AutomationRules;

use App\Models\AutomationRule;
use App\Models\Conversation;
use App\Models\Message;
use Carbon\CarbonInterface;
use Throwable;

// Bản dịch an toàn của ConditionsFilterService OSS. Bản gốc dựng SQL động từ
// filter_keys.yml; ở Yona, tập dữ liệu một conversation nên so sánh thuần PHP
// vừa giữ semantics vừa không đưa attribute_key từ admin vào SQL identifier.
final class ConditionsFilterService
{
    /** @param array<string, mixed> $options */
    public function __construct(
        private readonly AutomationRule $rule,
        private readonly Conversation $conversation,
        private readonly array $options = [],
    ) {}

    public function perform(): bool
    {
        try {
            $conditions = $this->rule->conditions ?? [];
            if ($conditions === []) {
                return false;
            }

            $result = $this->matches($conditions[0]);
            for ($index = 1; $index < count($conditions); $index++) {
                $operator = strtoupper((string) ($conditions[$index - 1]['query_operator'] ?? 'AND'));
                $current = $this->matches($conditions[$index]);
                $result = $operator === 'OR' ? $result || $current : $result && $current;
            }

            return $result;
        } catch (Throwable $exception) {
            report($exception);

            return false;
        }
    }

    /** @param array<string, mixed> $condition */
    private function matches(array $condition): bool
    {
        $key = (string) ($condition['attribute_key'] ?? '');
        $operator = (string) ($condition['filter_operator'] ?? '');
        $values = $this->normalizedValues($condition['values'] ?? []);

        if ($operator === 'attribute_changed') {
            return $this->matchesAttributeChanged($condition);
        }

        $actual = $this->attributeValue($key);

        return match ($operator) {
            'is_present' => $this->isPresent($actual),
            'is_not_present' => ! $this->isPresent($actual),
            'equal_to' => $this->equals($actual, $values),
            'not_equal_to' => ! $this->equals($actual, $values),
            'contains' => $this->contains($actual, $values),
            'does_not_contain' => ! $this->contains($actual, $values),
            'starts_with' => $this->startsWith($actual, $values),
            'is_greater_than' => $this->compare($actual, $values[0] ?? null) > 0,
            'is_less_than' => $this->compare($actual, $values[0] ?? null) < 0,
            'days_before' => $this->compare($actual, now()->subDays((int) ($values[0] ?? 0))) < 0,
            default => false,
        };
    }

    private function attributeValue(string $key): mixed
    {
        $message = $this->options['message'] ?? null;
        $contact = $this->conversation->contact;

        return match ($key) {
            'status' => $this->conversation->statusName(),
            'assignee_id' => $this->conversation->assignee_id,
            'team_id' => $this->conversation->team_id,
            'inbox_id' => $this->conversation->inbox_id,
            'priority' => $this->conversation->priorityName(),
            'labels' => $this->conversation->labelList(),
            'display_id' => $this->conversation->display_id,
            'campaign_id' => $this->conversation->campaign_id,
            'created_at' => $this->conversation->created_at,
            'last_activity_at' => $this->conversation->last_activity_at,
            'browser_language', 'conversation_language', 'mail_subject', 'referer' => $this->conversation->additional_attributes[$key] ?? null,
            'message_type' => $message instanceof Message ? $message->typeName($message->message_type) : null,
            'private_note' => $message instanceof Message ? $message->private : null,
            'content' => $message instanceof Message ? ($message->processed_message_content ?? $message->content) : null,
            'email' => $contact?->email,
            'phone_number' => $contact?->phone_number,
            'country_code' => $contact?->additional_attributes['country_code'] ?? $contact?->country_code,
            'company_name' => $contact?->additional_attributes['company_name'] ?? null,
            'city' => $contact?->additional_attributes['city'] ?? $contact?->location,
            default => null,
        };
    }

    /** @param array<string, mixed> $condition */
    private function matchesAttributeChanged(array $condition): bool
    {
        $changes = $this->options['changed_attributes'] ?? [];
        $change = $changes[$condition['attribute_key'] ?? ''] ?? null;
        $from = $this->normalizedValues($condition['values']['from'] ?? []);
        $to = $this->normalizedValues($condition['values']['to'] ?? []);

        if (! is_array($change) || count($change) < 2) {
            return false;
        }

        return in_array($change[0], $from, false) && in_array($change[1], $to, false);
    }

    private function isPresent(mixed $actual): bool
    {
        return is_array($actual) ? $actual !== [] : $actual !== null && $actual !== '';
    }

    /** @param list<mixed> $values */
    private function equals(mixed $actual, array $values): bool
    {
        if (is_array($actual)) {
            return array_intersect($actual, $values) !== [];
        }

        foreach ($values as $value) {
            if ($this->same($actual, $value)) {
                return true;
            }
        }

        return false;
    }

    /** @param list<mixed> $values */
    private function contains(mixed $actual, array $values): bool
    {
        $actual = mb_strtolower((string) $actual);

        foreach ($values as $value) {
            if (str_contains($actual, mb_strtolower(trim((string) $value)))) {
                return true;
            }
        }

        return false;
    }

    /** @param list<mixed> $values */
    private function startsWith(mixed $actual, array $values): bool
    {
        $actual = mb_strtolower((string) $actual);

        foreach ($values as $value) {
            if (str_starts_with($actual, mb_strtolower((string) $value))) {
                return true;
            }
        }

        return false;
    }

    private function compare(mixed $left, mixed $right): int
    {
        if ($left instanceof CarbonInterface) {
            $left = $left->timestamp;
        } elseif (is_numeric($left)) {
            $left = (float) $left;
        } else {
            $left = is_string($left) ? strtotime($left) ?: mb_strtolower($left) : $left;
        }

        if ($right instanceof CarbonInterface) {
            $right = $right->timestamp;
        } elseif (is_numeric($right)) {
            $right = (float) $right;
        } else {
            $right = is_string($right) ? strtotime($right) ?: mb_strtolower($right) : $right;
        }

        return $left <=> $right;
    }

    private function same(mixed $left, mixed $right): bool
    {
        if (is_bool($left) || is_bool($right)) {
            return (bool) $left === filter_var($right, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        }

        return (string) $left === (string) $right;
    }

    /** @return list<mixed> */
    private function normalizedValues(mixed $values): array
    {
        if ($values === null || $values === '') {
            return [];
        }

        $values = is_array($values) ? $values : [$values];

        return array_values(array_map(
            fn (mixed $value) => is_array($value) && array_key_exists('id', $value) ? $value['id'] : $value,
            $values,
        ));
    }
}

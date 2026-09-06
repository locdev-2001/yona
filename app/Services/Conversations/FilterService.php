<?php

namespace App\Services\Conversations;

use App\Finders\ConversationFinder;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

// Port từ Conversations::FilterService + FilterService của Chatwoot.
// Chỉ nhận whitelist thuộc tính/operator mà popup hiện tại phát ra; mọi giá trị
// đều đi qua query binding hoặc Eloquent để không ghép dữ liệu người dùng vào SQL.
class FilterService
{
    private const MAX_CONDITIONS = 20;

    private const PRESENCE_OPERATORS = ['equal_to', 'not_equal_to', 'is_present', 'is_not_present'];

    private const EQUALITY_OPERATORS = ['equal_to', 'not_equal_to'];

    private const CONTAINMENT_OPERATORS = ['equal_to', 'not_equal_to', 'contains', 'does_not_contain'];

    private const DATE_OPERATORS = ['is_greater_than', 'is_less_than', 'days_before'];

    /** @var array<string, array<int, string>> */
    private const ATTRIBUTE_OPERATORS = [
        'status' => self::EQUALITY_OPERATORS,
        'priority' => self::EQUALITY_OPERATORS,
        'assignee_id' => self::PRESENCE_OPERATORS,
        'inbox_id' => self::PRESENCE_OPERATORS,
        'team_id' => self::PRESENCE_OPERATORS,
        'contact_id' => self::EQUALITY_OPERATORS,
        'display_id' => self::CONTAINMENT_OPERATORS,
        'campaign_id' => self::PRESENCE_OPERATORS,
        'labels' => self::PRESENCE_OPERATORS,
        'browser_language' => self::EQUALITY_OPERATORS,
        'referer' => self::CONTAINMENT_OPERATORS,
        'created_at' => self::DATE_OPERATORS,
        'last_activity_at' => self::DATE_OPERATORS,
    ];

    /** @param array<int, array<string, mixed>> $payload */
    public function __construct(
        private readonly User $user,
        private readonly Account $account,
        private readonly AccountUser $accountUser,
        private readonly array $payload,
        private readonly int $page = 1,
    ) {}

    /** @return array{conversations: Collection<int, Conversation>, count: array<string, int>} */
    public function perform(): array
    {
        $this->validatePayload();

        $conversations = $this->baseRelation();
        $conversations->where(function (Builder $group): void {
            foreach ($this->payload as $index => $condition) {
                $boolean = $index > 0 ? ($this->payload[$index - 1]['query_operator'] ?? 'and') : 'and';
                $method = $boolean === 'or' ? 'orWhere' : 'where';

                $group->{$method}(fn (Builder $query) => $this->applyCondition($query, $condition));
            }
        });

        $page = max(1, $this->page);

        $items = $conversations->clone()
            ->select('conversations.*')
            // Đếm cùng đúng một SQL snapshot với payload. Nếu status vừa đổi,
            // tách COUNT và SELECT thành hai query có thể tạo meta=0 nhưng card=1.
            ->selectRaw('COUNT(*) FILTER (WHERE assignee_id = ?) OVER() AS filter_mine_count', [$this->user->id])
            ->selectRaw('COUNT(*) FILTER (WHERE assignee_id IS NULL AND assignee_agent_bot_id IS NULL) OVER() AS filter_unassigned_count')
            ->selectRaw('COUNT(*) OVER() AS filter_all_count')
            ->with(['inbox', 'assignee.avatar', 'contact.avatar', 'team', 'contactInbox'])
            ->sortOnLastActivityAt('desc')
            ->offset(($page - 1) * ConversationFinder::RESULTS_PER_PAGE)
            ->limit(ConversationFinder::RESULTS_PER_PAGE)
            ->get();

        if ($items->isEmpty()) {
            [$mineCount, $unassignedCount, $allCount] = $this->counts($conversations);
        } else {
            $mineCount = (int) $items->first()->getAttribute('filter_mine_count');
            $unassignedCount = (int) $items->first()->getAttribute('filter_unassigned_count');
            $allCount = (int) $items->first()->getAttribute('filter_all_count');
        }

        return [
            'conversations' => $items,
            'count' => [
                'mine_count' => $mineCount,
                'assigned_count' => $allCount - $unassignedCount,
                'unassigned_count' => $unassignedCount,
                'all_count' => $allCount,
            ],
        ];
    }

    /** @return Builder<Conversation> */
    private function baseRelation(): Builder
    {
        $query = Conversation::query()->where('account_id', $this->account->id);

        if (! $this->accountUser->isAdministrator()) {
            $inboxIds = $this->user
                ->assignedInboxes($this->account, $this->accountUser)
                ->pluck('id');
            $query->whereIn('inbox_id', $inboxIds);
        }

        return $query;
    }

    /** @param array<string, mixed> $condition */
    private function applyCondition(Builder $query, array $condition): void
    {
        $attribute = $condition['attribute_key'];
        $operator = $condition['filter_operator'];
        $values = $condition['values'];

        match ($attribute) {
            'status' => $this->applyStatus($query, $operator, $values),
            'priority' => $this->applyPriority($query, $operator, $values),
            'assignee_id' => $this->applyAssignee($query, $operator, $values),
            'labels' => $this->applyLabels($query, $operator, $values),
            'browser_language', 'referer' => $this->applyAdditionalAttribute(
                $query,
                $attribute,
                $operator,
                $values,
            ),
            'created_at', 'last_activity_at' => $this->applyDate($query, $attribute, $operator, $values[0]),
            'display_id' => $this->applyDisplayId($query, $operator, $values),
            default => $this->applyColumn($query, $attribute, $operator, $values),
        };
    }

    /** @param array<int, mixed> $values */
    private function applyStatus(Builder $query, string $operator, array $values): void
    {
        if (in_array('all', $values, true)) {
            $query->whereRaw($operator === 'equal_to' ? '1 = 1' : '1 = 0');

            return;
        }

        $mapped = collect($values)
            ->map(fn ($value) => array_search($value, Conversation::STATUS_NAMES, true))
            ->filter(fn ($value) => $value !== false)
            ->values()
            ->all();

        $this->applySet($query, 'conversations.status', $operator, $mapped);
    }

    /** @param array<int, mixed> $values */
    private function applyPriority(Builder $query, string $operator, array $values): void
    {
        $mapped = collect($values)
            ->map(fn ($value) => array_search($value, Conversation::PRIORITY_NAMES, true))
            ->filter(fn ($value) => $value !== false)
            ->values()
            ->all();

        $this->applySet($query, 'conversations.priority', $operator, $mapped);
    }

    /** @param array<int, mixed> $values */
    private function applyAssignee(Builder $query, string $operator, array $values): void
    {
        if ($operator === 'is_present') {
            $query->where(fn (Builder $assigned) => $assigned
                ->whereNotNull('conversations.assignee_id')
                ->orWhereNotNull('conversations.assignee_agent_bot_id'));

            return;
        }

        if ($operator === 'is_not_present') {
            $query->whereNull('conversations.assignee_id')
                ->whereNull('conversations.assignee_agent_bot_id');

            return;
        }

        $this->applySet($query, 'conversations.assignee_id', $operator, $values);
    }

    /** @param array<int, mixed> $values */
    private function applyLabels(Builder $query, string $operator, array $values): void
    {
        if ($operator === 'is_present') {
            $query->whereHas('labels');

            return;
        }

        if ($operator === 'is_not_present') {
            $query->whereDoesntHave('labels');

            return;
        }

        $callback = fn (Builder $labels) => $labels->whereIn('title', $values);
        $operator === 'equal_to'
            ? $query->whereHas('labels', $callback)
            : $query->whereDoesntHave('labels', $callback);
    }

    /** @param array<int, mixed> $values */
    private function applyAdditionalAttribute(
        Builder $query,
        string $attribute,
        string $operator,
        array $values,
    ): void {
        // $attribute đến từ whitelist ATTRIBUTE_OPERATORS, không phải dữ liệu tự do.
        $expression = "LOWER(conversations.additional_attributes->>'{$attribute}')";
        $normalized = array_map(fn ($value) => mb_strtolower(trim((string) $value)), $values);

        $this->applyTextExpression($query, $expression, $operator, $normalized);
    }

    /** @param array<int, mixed> $values */
    private function applyDisplayId(Builder $query, string $operator, array $values): void
    {
        if (in_array($operator, ['equal_to', 'not_equal_to'], true)) {
            $this->applySet($query, 'conversations.display_id', $operator, $values);

            return;
        }

        $normalized = array_map(fn ($value) => trim((string) $value), $values);
        $this->applyTextExpression($query, 'CAST(conversations.display_id AS TEXT)', $operator, $normalized);
    }

    /** @param array<int, mixed> $values */
    private function applyColumn(Builder $query, string $column, string $operator, array $values): void
    {
        $qualified = "conversations.{$column}";

        if ($operator === 'is_present') {
            $query->whereNotNull($qualified);

            return;
        }

        if ($operator === 'is_not_present') {
            $query->whereNull($qualified);

            return;
        }

        $this->applySet($query, $qualified, $operator, $values);
    }

    private function applyDate(Builder $query, string $column, string $operator, mixed $value): void
    {
        $date = $operator === 'days_before'
            ? now()->startOfDay()->subDays((int) $value)->toDateString()
            : (string) $value;
        $comparison = $operator === 'is_greater_than' ? '>' : '<';

        $query->whereDate("conversations.{$column}", $comparison, $date);
    }

    /** @param array<int, mixed> $values */
    private function applySet(Builder $query, string $column, string $operator, array $values): void
    {
        $operator === 'equal_to'
            ? $query->whereIn($column, $values)
            : $query->whereNotIn($column, $values);
    }

    /** @param array<int, string> $values */
    private function applyTextExpression(
        Builder $query,
        string $expression,
        string $operator,
        array $values,
    ): void {
        if (in_array($operator, ['equal_to', 'not_equal_to'], true)) {
            $placeholders = implode(', ', array_fill(0, count($values), '?'));
            $comparison = $operator === 'equal_to' ? 'IN' : 'NOT IN';
            $query->whereRaw("{$expression} {$comparison} ({$placeholders})", $values);

            return;
        }

        $query->where(function (Builder $text) use ($expression, $operator, $values): void {
            foreach ($values as $index => $value) {
                $method = $operator === 'contains' && $index > 0 ? 'orWhereRaw' : 'whereRaw';
                $comparison = $operator === 'contains' ? 'LIKE' : 'NOT LIKE';
                $text->{$method}("{$expression} {$comparison} ?", ["%{$value}%"]);
            }
        });
    }

    /** @return array{0: int, 1: int, 2: int} */
    private function counts(Builder $query): array
    {
        $counts = $query->clone()
            ->selectRaw('COUNT(*) FILTER (WHERE assignee_id = ?) AS mine_count', [$this->user->id])
            ->selectRaw('COUNT(*) FILTER (WHERE assignee_id IS NULL AND assignee_agent_bot_id IS NULL) AS unassigned_count')
            ->selectRaw('COUNT(*) AS all_count')
            ->toBase()
            ->first();

        return [(int) $counts->mine_count, (int) $counts->unassigned_count, (int) $counts->all_count];
    }

    private function validatePayload(): void
    {
        if ($this->payload === [] || count($this->payload) > self::MAX_CONDITIONS) {
            throw ValidationException::withMessages(['payload' => 'The filter payload must contain between 1 and 20 conditions.']);
        }

        $lastIndex = count($this->payload) - 1;

        foreach ($this->payload as $index => $condition) {
            $attribute = $condition['attribute_key'] ?? null;
            $operator = $condition['filter_operator'] ?? null;
            $values = $condition['values'] ?? null;
            $queryOperator = $condition['query_operator'] ?? null;

            if (! is_string($attribute) || ! isset(self::ATTRIBUTE_OPERATORS[$attribute])) {
                $this->invalid($index, 'attribute_key');
            }
            if (! is_string($operator) || ! in_array($operator, self::ATTRIBUTE_OPERATORS[$attribute], true)) {
                $this->invalid($index, 'filter_operator');
            }
            if (! is_array($values) || collect($values)->contains(fn ($value) => ! is_scalar($value))) {
                $this->invalid($index, 'values');
            }
            if (! in_array($operator, ['is_present', 'is_not_present'], true) && $values === []) {
                $this->invalid($index, 'values');
            }
            if ($operator === 'days_before' && filter_var($values[0] ?? null, FILTER_VALIDATE_INT) === false) {
                $this->invalid($index, 'values');
            }
            if ($operator === 'days_before' && ! ((int) $values[0] >= 1 && (int) $values[0] <= 998)) {
                $this->invalid($index, 'values');
            }
            if ($index < $lastIndex && ! in_array($queryOperator, ['and', 'or'], true)) {
                $this->invalid($index, 'query_operator');
            }
            if ($index === $lastIndex && $queryOperator !== null) {
                $this->invalid($index, 'query_operator');
            }
        }
    }

    private function invalid(int $index, string $field): never
    {
        throw ValidationException::withMessages([
            "payload.{$index}.{$field}" => 'The conversation filter is invalid.',
        ]);
    }
}

<?php

namespace App\Services\Admin\AiAnalytics;

use App\Models\Account;
use App\Models\AiAgent;
use App\Models\AiUsageAnalytic;
use App\Services\Admin\Metrics\DateRange;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;

// Số liệu trang Phân tích AI, chỉ đọc ai_usage_analytics (không đọc api_logs). Đọc dòng
// của kỳ SOURCE_PERIOD; khi có dòng gộp theo ngày thì đổi kỳ nguồn ở đây.
final class AiUsageReport
{
    public const SOURCE_PERIOD = AiUsageAnalytic::PERIOD_HOUR;

    // Bộ đếm theo cột của biểu đồ: kết quả lượt, token và cache, lỗi và chuyển tuyến.
    private const BUCKET_COUNTERS = ['turns', 'replies', 'handoffs', 'failed_turns', 'input_tokens', 'cache_read_tokens', 'cache_write_tokens', 'output_tokens', 'failed_calls', 'route_changes', 'model_calls'];

    private const ACCOUNT_COUNTERS = ['turns', 'replies', 'handoffs', 'failed_turns', 'input_tokens', 'cache_read_tokens', 'cache_write_tokens', 'cost_micro_usd'];

    /** @return array<string, mixed> */
    public function build(UsageWindow $window, ?int $accountId, ?int $aiAgentId): array
    {
        $previous = $window->previous();

        return [
            'totals' => $this->totals($window, $accountId, $aiAgentId),
            'previousTotals' => $this->totals($previous, $accountId, $aiAgentId),
            'hourlyCost' => $this->hourlyCost($window, $previous, $accountId, $aiAgentId),
            'buckets' => $this->buckets($window, $accountId, $aiAgentId),
            'accounts' => $this->accounts($window, $accountId, $aiAgentId),
        ];
    }

    /** @return array{accounts: list<array{value: string, label: string}>, aiAgents: list<array{value: string, label: string, accountId: int}>} */
    public function options(?int $accountId): array
    {
        $accountIds = $this->rows()->distinct()->pluck('account_id');
        $agentRows = $this->rows()
            ->when($accountId !== null, fn (Builder $query) => $query->where('account_id', $accountId))
            ->select('account_id', 'ai_agent_id')->distinct()->get();
        $names = AiAgent::query()->whereKey($agentRows->pluck('ai_agent_id'))->pluck('name', 'id');

        return [
            'accounts' => Account::query()->whereKey($accountIds)->orderBy('name')->get(['id', 'name'])
                ->map(fn (Account $account) => ['value' => (string) $account->id, 'label' => $account->name])->values()->all(),
            'aiAgents' => $agentRows
                ->map(fn (object $row) => [
                    'value' => (string) $row->ai_agent_id,
                    'label' => $names[$row->ai_agent_id] ?? null,
                    'accountId' => (int) $row->account_id,
                ])
                ->sortBy(fn (array $option) => [$option['label'] === null ? 1 : 0, $option['label'] ?? '', (int) $option['value']])
                ->values()->all(),
        ];
    }

    private function rows(): Builder
    {
        return AiUsageAnalytic::query()->toBase()->where('period', self::SOURCE_PERIOD);
    }

    private function scoped(UsageWindow $window, ?int $accountId, ?int $aiAgentId): Builder
    {
        return $this->rows()
            ->where('period_start', '>=', $window->startsAt)
            ->where('period_start', '<', $window->endsBefore)
            ->when($accountId !== null, fn (Builder $query) => $query->where('account_id', $accountId))
            ->when($aiAgentId !== null, fn (Builder $query) => $query->where('ai_agent_id', $aiAgentId));
    }

    /** @param  list<string>  $counters */
    private static function sums(array $counters): string
    {
        return implode(', ', array_map(fn (string $counter) => "coalesce(sum({$counter}), 0) as {$counter}", $counters));
    }

    /** @return array<string, int> */
    private function totals(UsageWindow $window, ?int $accountId, ?int $aiAgentId): array
    {
        $row = $this->scoped($window, $accountId, $aiAgentId)
            ->selectRaw(self::sums(AiUsageAnalytic::COUNTERS).', count(distinct ai_agent_id) as ai_agents')
            ->first();

        return array_map('intval', (array) $row);
    }

    /** @return list<array{at: string, cost: int, previousCost: int}> */
    private function hourlyCost(UsageWindow $window, UsageWindow $previous, ?int $accountId, ?int $aiAgentId): array
    {
        $costByHour = fn (UsageWindow $range) => $this->scoped($range, $accountId, $aiAgentId)
            ->selectRaw('period_start, sum(cost_micro_usd) as cost')
            ->groupBy('period_start')
            ->get()
            ->mapWithKeys(fn (object $row) => [UsageWindow::hourKey(CarbonImmutable::parse($row->period_start, 'UTC')) => (int) $row->cost]);

        $current = $costByHour($window);
        $before = $costByHour($previous);
        $previousHours = $previous->hours();

        return array_map(fn (CarbonImmutable $hour, int $index) => [
            'at' => UsageWindow::hourKey($hour),
            'cost' => $current[UsageWindow::hourKey($hour)] ?? 0,
            'previousCost' => isset($previousHours[$index]) ? ($before[UsageWindow::hourKey($previousHours[$index])] ?? 0) : 0,
        ], $window->hours(), array_keys($window->hours()));
    }

    /** @return list<array<string, int|string>> */
    private function buckets(UsageWindow $window, ?int $accountId, ?int $aiAgentId): array
    {
        $key = $window->bucket() === UsageWindow::BUCKET_HOUR ? 'period_start' : DateRange::localDateSql('period_start');
        $rows = $this->scoped($window, $accountId, $aiAgentId)
            ->selectRaw("{$key} as bucket, ".self::sums(self::BUCKET_COUNTERS))
            ->groupByRaw($key)
            ->get()
            ->keyBy(fn (object $row) => $window->bucket() === UsageWindow::BUCKET_HOUR
                ? UsageWindow::hourKey(CarbonImmutable::parse($row->bucket, 'UTC'))
                : (string) $row->bucket);

        return array_map(fn (string $bucket) => [
            'key' => $bucket,
            ...array_combine(self::BUCKET_COUNTERS, array_map(fn (string $counter) => (int) ($rows[$bucket]->{$counter} ?? 0), self::BUCKET_COUNTERS)),
        ], $window->bucketKeys());
    }

    /** @return list<array<string, int|string|null>> */
    private function accounts(UsageWindow $window, ?int $accountId, ?int $aiAgentId): array
    {
        /** @var Collection<int, object> $rows */
        $rows = $this->scoped($window, $accountId, $aiAgentId)
            ->selectRaw('account_id, count(distinct ai_agent_id) as ai_agents, '.self::sums(self::ACCOUNT_COUNTERS))
            ->groupBy('account_id')
            ->get();
        $names = Account::query()->whereKey($rows->pluck('account_id'))->pluck('name', 'id');

        return $rows
            ->map(fn (object $row) => [
                'accountId' => (int) $row->account_id,
                'name' => $names[$row->account_id] ?? null,
                'aiAgents' => (int) $row->ai_agents,
                ...array_combine(self::ACCOUNT_COUNTERS, array_map(fn (string $counter) => (int) $row->{$counter}, self::ACCOUNT_COUNTERS)),
            ])
            ->sortByDesc('cost_micro_usd')
            ->values()
            ->all();
    }
}

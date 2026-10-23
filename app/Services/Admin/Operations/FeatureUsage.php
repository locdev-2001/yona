<?php

namespace App\Services\Admin\Operations;

use App\Models\Account;
use App\Models\ProductEvent;
use App\Services\Admin\Metrics\DateRange;
use App\Services\ProductEvents\ProductEventName;
use App\Support\SuperAdminArea;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

// Mức dùng tính năng (/admin/feature_usage): mỗi sự kiện sản phẩm bao nhiêu
// account đã dùng trong 7/30/90 ngày và từ trước tới nay, tổng lượt, lần gần
// nhất, xu hướng 30 ngày; và account nào đang dùng một tính năng. Đọc từ
// product_events, hai câu GROUP BY cho cả trang.
final class FeatureUsage
{
    public const WINDOWS = [7, 30, 90];

    public const TREND_DAYS = 30;

    public const ACCOUNTS_LIMIT = 500;

    /** @return list<array<string, mixed>> theo thứ tự danh mục, nhóm kích hoạt trước */
    public function summary(): array
    {
        $windowSelects = array_map(fn (int $days) => "count(distinct account_id) filter (where occurred_at >= ?) as accounts_{$days}d", self::WINDOWS);
        $windowBindings = array_map(fn (int $days) => now()->subDays($days)->utc()->toDateTimeString(), self::WINDOWS);

        $totals = ProductEvent::query()
            ->toBase()
            ->selectRaw(
                implode(', ', ['name', ...$windowSelects, 'count(distinct account_id) as accounts_all', 'count(*) as events', 'max(occurred_at) as last_at']),
                $windowBindings,
            )
            ->groupBy('name')
            ->get()
            ->keyBy('name');

        $trends = $this->trends();

        return array_map(function (ProductEventName $name) use ($totals, $trends) {
            $row = $totals[$name->value] ?? null;

            return [
                'key' => $name->value,
                'label' => $name->label(),
                'group' => $name->group(),
                'accounts' => [
                    ...array_combine(
                        array_map(fn (int $days) => "{$days}d", self::WINDOWS),
                        array_map(fn (int $days) => (int) ($row?->{"accounts_{$days}d"} ?? 0), self::WINDOWS),
                    ),
                    'all' => (int) ($row->accounts_all ?? 0),
                ],
                'events' => (int) ($row->events ?? 0),
                'lastAt' => $this->iso($row->last_at ?? null),
                'trend' => $trends[$name->value] ?? array_fill(0, self::TREND_DAYS, 0),
                'url' => SuperAdminArea::url('feature-usage/'.str_replace('_', '-', $name->value)),
            ];
        }, ProductEventName::cases());
    }

    /**
     * Account đã dùng một tính năng, dùng gần nhất trước.
     *
     * @return list<array<string, mixed>>
     */
    public function accounts(ProductEventName $name): array
    {
        $since30d = now()->subDays(30)->utc()->toDateTimeString();

        return ProductEvent::query()
            ->toBase()
            ->where('name', $name->value)
            ->groupBy('account_id')
            ->selectRaw('account_id, count(*) as events, min(occurred_at) as first_at, max(occurred_at) as last_at')
            ->selectRaw('count(*) filter (where occurred_at >= ?) as events_30d', [$since30d])
            ->orderByDesc('last_at')
            ->limit(self::ACCOUNTS_LIMIT)
            ->get()
            ->pipe(function ($rows) {
                $names = Account::query()->whereIn('id', $rows->pluck('account_id'))->pluck('name', 'id');

                return $rows->map(fn (object $row) => [
                    'accountId' => (int) $row->account_id,
                    'accountName' => $names[$row->account_id] ?? null,
                    'events' => (int) $row->events,
                    'events30d' => (int) $row->events_30d,
                    'firstAt' => $this->iso($row->first_at),
                    'lastAt' => $this->iso($row->last_at),
                    'url' => SuperAdminArea::url("accounts/{$row->account_id}/overview"),
                ])->values()->all();
            });
    }

    /**
     * Tính năng một account đã dùng: số lượt và lần gần nhất (Account 360).
     *
     * @return list<array{key: string, label: string, group: string, events: int, lastAt: ?string}>
     */
    public function forAccount(Account $account): array
    {
        $rows = ProductEvent::query()
            ->toBase()
            ->where('account_id', $account->id)
            ->groupBy('name')
            ->selectRaw('name, count(*) as events, max(occurred_at) as last_at')
            ->get()
            ->keyBy('name');

        $features = [];
        foreach (ProductEventName::cases() as $name) {
            if (! $name->isFeature() || ! isset($rows[$name->value])) {
                continue;
            }

            $features[] = [
                'key' => $name->value,
                'label' => $name->label(),
                'group' => $name->group(),
                'events' => (int) $rows[$name->value]->events,
                'lastAt' => $this->iso($rows[$name->value]->last_at),
            ];
        }

        usort($features, fn (array $left, array $right) => strcmp((string) $right['lastAt'], (string) $left['lastAt']));

        return $features;
    }

    /** @return array<string, list<int>> số lượt mỗi ngày (giờ Việt Nam) trong TREND_DAYS ngày */
    private function trends(): array
    {
        $range = DateRange::preset(self::TREND_DAYS.'d');
        $dates = $range->dates();
        $index = array_flip($dates);

        $rows = DB::table('product_events')
            ->where('occurred_at', '>=', $range->startsAtUtc())
            ->where('occurred_at', '<', $range->endsBeforeUtc())
            ->selectRaw('name, '.DateRange::localDateSql('occurred_at').' as local_day, count(*) as total')
            ->groupBy('name', 'local_day')
            ->get();

        $trends = [];
        foreach ($rows as $row) {
            $trends[$row->name] ??= array_fill(0, count($dates), 0);
            $position = $index[(string) $row->local_day] ?? null;
            if ($position !== null) {
                $trends[$row->name][$position] = (int) $row->total;
            }
        }

        return $trends;
    }

    private function iso(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return ($value instanceof CarbonInterface ? $value : Carbon::parse($value, 'UTC'))->toIso8601String();
    }
}

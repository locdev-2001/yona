<?php

namespace App\Services\ReportingEvents;

use App\Models\Account;
use App\Models\ReportingEvent;
use App\Models\ReportingEventsRollup;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Port từ refs/chatwoot/app/services/reporting_events/backfill_service.rb —
 * dựng lại toàn bộ dòng rollup của MỘT ngày từ sự kiện thô (dùng khi rollup lệch
 * hoặc khi dữ liệu có trước lúc bật rollup).
 */
final class BackfillService
{
    /** @var list<array{type: string, column: ?string}> */
    private const DIMENSIONS = [
        ['type' => ReportingEventsRollup::DIMENSION_ACCOUNT, 'column' => null],
        ['type' => ReportingEventsRollup::DIMENSION_AGENT, 'column' => 'user_id'],
        ['type' => ReportingEventsRollup::DIMENSION_INBOX, 'column' => 'inbox_id'],
    ];

    // COUNT(DISTINCT ...) không cộng dồn được nên nhóm này phải đếm riêng từng chiều.
    private const DISTINCT_COUNT_EVENTS = [ReportingEvent::NAME_CONVERSATION_BOT_HANDOFF];

    public function __construct(
        private readonly Account $account,
        private readonly string $date,
    ) {}

    public static function backfillDate(Account $account, string $date): void
    {
        (new self($account, $date))->perform();
    }

    public function perform(): void
    {
        [$startUtc, $endUtc] = $this->dateBoundariesInUtc();
        $rows = $this->buildRollupRows($startUtc, $endUtc);

        DB::transaction(function () use ($rows) {
            ReportingEventsRollup::query()
                ->where('account_id', $this->account->id)
                ->where('date', $this->date)
                ->delete();

            if ($rows !== []) {
                ReportingEventsRollup::query()->insert($rows);
            }
        });
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    private function dateBoundariesInUtc(): array
    {
        $timezone = $this->account->reportingTimezone() ?? 'UTC';
        $start = CarbonImmutable::parse($this->date, $timezone)->startOfDay();

        return [$start->utc(), $start->addDay()->utc()];
    }

    /** @return list<array<string, mixed>> */
    private function buildRollupRows(CarbonImmutable $startUtc, CarbonImmutable $endUtc): array
    {
        $now = now();

        return collect($this->buildAggregates($startUtc, $endUtc))
            ->map(fn (array $data, string $key) => [
                ...array_combine(['dimension_type', 'dimension_id', 'metric'], explode('|', $key)),
                'account_id' => $this->account->id,
                'date' => $this->date,
                'count' => $data['count'],
                'sum_value' => $data['sum_value'],
                'sum_value_business_hours' => $data['sum_value_business_hours'],
                'created_at' => $now,
                'updated_at' => $now,
            ])
            ->values()
            ->all();
    }

    /** @return array<string, array{count: int, sum_value: float, sum_value_business_hours: float}> */
    private function buildAggregates(CarbonImmutable $startUtc, CarbonImmutable $endUtc): array
    {
        $standardNames = array_values(array_diff(EventMetricRegistry::eventNames(), self::DISTINCT_COUNT_EVENTS));
        $aggregates = [];

        foreach (self::DIMENSIONS as $dimension) {
            $this->aggregateStandardEvents($aggregates, $dimension, $standardNames, $startUtc, $endUtc);
            $this->aggregateDistinctEvents($aggregates, $dimension, $startUtc, $endUtc);
        }

        return $aggregates;
    }

    /**
     * @param  array<string, array{count: int, sum_value: float, sum_value_business_hours: float}>  $aggregates
     * @param  array{type: string, column: ?string}  $dimension
     * @param  list<string>  $eventNames
     */
    private function aggregateStandardEvents(
        array &$aggregates,
        array $dimension,
        array $eventNames,
        CarbonImmutable $startUtc,
        CarbonImmutable $endUtc,
    ): void {
        $groupColumns = array_values(array_filter(['name', $dimension['column']]));

        $rows = $this->baseQuery($startUtc, $endUtc)
            ->whereIn('name', $eventNames)
            ->select([
                ...$groupColumns,
                DB::raw('count(*) as event_count'),
                DB::raw('coalesce(sum(value), 0) as sum_value'),
                DB::raw('coalesce(sum(value_in_business_hours), 0) as sum_value_business_hours'),
            ])
            ->groupBy($groupColumns)
            ->get();

        foreach ($rows as $row) {
            $dimensionId = $dimension['column'] === null ? $this->account->id : $row->{$dimension['column']};

            if ($dimensionId === null) {
                continue;
            }

            $this->accumulate($aggregates, $dimension['type'], (int) $dimensionId, (string) $row->name, [
                'count' => (int) $row->event_count,
                'sum_value' => (float) $row->sum_value,
                'sum_value_business_hours' => (float) $row->sum_value_business_hours,
            ]);
        }
    }

    /**
     * @param  array<string, array{count: int, sum_value: float, sum_value_business_hours: float}>  $aggregates
     * @param  array{type: string, column: ?string}  $dimension
     */
    private function aggregateDistinctEvents(
        array &$aggregates,
        array $dimension,
        CarbonImmutable $startUtc,
        CarbonImmutable $endUtc,
    ): void {
        $groupColumns = array_values(array_filter(['name', $dimension['column']]));

        $rows = $this->baseQuery($startUtc, $endUtc)
            ->whereIn('name', self::DISTINCT_COUNT_EVENTS)
            ->select([...$groupColumns, DB::raw('count(distinct conversation_id) as event_count')])
            ->groupBy($groupColumns)
            ->get();

        foreach ($rows as $row) {
            $dimensionId = $dimension['column'] === null ? $this->account->id : $row->{$dimension['column']};

            if ($dimensionId === null) {
                continue;
            }

            $this->accumulate($aggregates, $dimension['type'], (int) $dimensionId, (string) $row->name, [
                'count' => (int) $row->event_count,
                'sum_value' => 0.0,
                'sum_value_business_hours' => 0.0,
            ]);
        }
    }

    /**
     * @param  array<string, array{count: int, sum_value: float, sum_value_business_hours: float}>  $aggregates
     * @param  array{count: int, sum_value: float, sum_value_business_hours: float}  $values
     */
    private function accumulate(array &$aggregates, string $dimensionType, int $dimensionId, string $eventName, array $values): void
    {
        $metrics = EventMetricRegistry::metricsForAggregate(
            $eventName,
            $values['count'],
            $values['sum_value'],
            $values['sum_value_business_hours'],
        );

        foreach ($metrics as $metric => $metricData) {
            $key = "{$dimensionType}|{$dimensionId}|{$metric}";
            $aggregates[$key] ??= ['count' => 0, 'sum_value' => 0.0, 'sum_value_business_hours' => 0.0];
            $aggregates[$key]['count'] += $metricData['count'];
            $aggregates[$key]['sum_value'] += $metricData['sum_value'];
            $aggregates[$key]['sum_value_business_hours'] += $metricData['sum_value_business_hours'];
        }
    }

    /** @return Builder */
    private function baseQuery(CarbonImmutable $startUtc, CarbonImmutable $endUtc)
    {
        return DB::table('reporting_events')
            ->where('account_id', $this->account->id)
            ->where('created_at', '>=', $startUtc)
            ->where('created_at', '<', $endUtc);
    }
}

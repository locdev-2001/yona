<?php

namespace App\Services\Reports;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Thay gem Groupdate (`group_by_period(period, :created_at, default_value: 0,
 * range:, time_zone:)`): gộp bản ghi theo mốc thời gian ĐỊA PHƯƠNG của người xem
 * rồi trả về đủ mọi mốc trong khoảng, mốc rỗng nhận giá trị 0.
 */
final class TimeseriesGrouper
{
    public const DEFAULT_PERIOD = 'day';

    public const SUPPORTED_PERIODS = ['hour', 'day', 'week', 'month', 'year'];

    public function __construct(
        private readonly string $period,
        private readonly string $timezone,
        private readonly ?ReportRange $range,
    ) {}

    public static function period(mixed $groupBy): string
    {
        $period = (string) $groupBy;

        return in_array($period, self::SUPPORTED_PERIODS, true) ? $period : self::DEFAULT_PERIOD;
    }

    /** @return array<int, int> epoch mốc → số bản ghi */
    public function count(Builder $query, string $column = 'created_at'): array
    {
        return $this->aggregate($query, $column, 'count(*)', fn ($value) => (int) $value);
    }

    /** @return array<int, float> epoch mốc → trung bình cột giá trị */
    public function average(Builder $query, string $valueColumn, string $column = 'created_at'): array
    {
        return $this->aggregate($query, $column, "avg({$valueColumn})", fn ($value) => (float) $value);
    }

    /** @return array<int, float|int> */
    private function aggregate(Builder $query, string $column, string $aggregateSql, callable $cast): array
    {
        $qualified = $query->getModel()->qualifyColumn($column);
        $bucket = $this->bucketExpression($qualified);

        // Bỏ ORDER BY sẵn có (Ruby: `unscope(:order)`) — cột sắp xếp cũ không nằm
        // trong GROUP BY nên Postgres sẽ từ chối truy vấn.
        $base = $this->applyRange($query->clone(), $qualified)->applyScopes()->getQuery();
        $base->orders = null;

        $rows = $base
            ->select(DB::raw("{$bucket} as report_bucket"), DB::raw("{$aggregateSql} as report_value"))
            ->groupBy(DB::raw($bucket))
            ->orderBy('report_bucket')
            ->get();

        $values = $this->series();

        foreach ($rows as $row) {
            $timestamp = CarbonImmutable::parse($row->report_bucket, $this->timezone)->getTimestamp();
            $values[$timestamp] = $row->report_value === null ? 0 : $cast($row->report_value);
        }

        if ($this->range === null) {
            ksort($values);
        }

        return $values;
    }

    private function applyRange(Builder $query, string $qualified): Builder
    {
        if ($this->range === null) {
            return $query;
        }

        return $query->where($qualified, '>=', $this->range->since)->where($qualified, '<', $this->range->until);
    }

    /**
     * Groupdate sinh dãy mốc từ mốc chứa `since` tới mốc cuối còn nằm TRONG
     * khoảng (đầu mút `until` bị loại vì khoảng nửa mở).
     *
     * @return array<int, int>
     */
    private function series(): array
    {
        if ($this->range === null) {
            return [];
        }

        $series = [];
        $bucket = $this->truncate($this->range->since->setTimezone($this->timezone));

        while (true) {
            $series[$bucket->getTimestamp()] = 0;
            $next = $this->truncate($this->advance($bucket));

            if ($next >= $this->range->until) {
                break;
            }

            $bucket = $next;
        }

        return $series;
    }

    private function truncate(CarbonImmutable $time): CarbonImmutable
    {
        $local = $time->setTimezone($this->timezone);

        return match ($this->period) {
            'hour' => $local->startOfHour(),
            // Groupdate mặc định tuần bắt đầu CHỦ NHẬT.
            'week' => $local->startOfWeek(CarbonImmutable::SUNDAY),
            'month' => $local->startOfMonth(),
            'year' => $local->startOfYear(),
            default => $local->startOfDay(),
        };
    }

    private function advance(CarbonImmutable $bucket): CarbonImmutable
    {
        return match ($this->period) {
            'hour' => $bucket->addHour(),
            'week' => $bucket->addWeek(),
            'month' => $bucket->addMonth(),
            'year' => $bucket->addYear(),
            default => $bucket->addDay(),
        };
    }

    private function bucketExpression(string $qualified): string
    {
        $timezone = str_replace("'", "''", $this->timezone);
        $local = "({$qualified} at time zone 'UTC' at time zone '{$timezone}')";

        if ($this->period === 'week') {
            return "(date_trunc('week', {$local} + interval '1 day') - interval '1 day')";
        }

        return "date_trunc('{$this->period}', {$local})";
    }
}

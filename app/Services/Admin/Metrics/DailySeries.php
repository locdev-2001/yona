<?php

namespace App\Services\Admin\Metrics;

use Illuminate\Database\Query\Builder;

// Đếm theo ngày (giờ Việt Nam) bằng một câu GROUP BY, rồi điền 0 cho ngày trống.
final class DailySeries
{
    private const DAY_ALIAS = 'local_day';

    /**
     * @param  array<string, string>  $aggregates  alias => biểu thức SQL tổng hợp
     * @return list<array<string, int|string>>
     */
    public static function count(Builder $query, string $timestampColumn, DateRange $range, array $aggregates): array
    {
        $selects = [DateRange::localDateSql($timestampColumn).' as '.self::DAY_ALIAS];
        foreach ($aggregates as $alias => $expression) {
            $selects[] = "{$expression} as {$alias}";
        }

        $rowsByDay = $query
            ->where($timestampColumn, '>=', $range->startsAtUtc())
            ->where($timestampColumn, '<', $range->endsBeforeUtc())
            ->selectRaw(implode(', ', $selects))
            ->groupBy(self::DAY_ALIAS)
            ->get()
            ->keyBy(static fn (object $row) => (string) $row->{self::DAY_ALIAS});

        return array_map(static function (string $date) use ($rowsByDay, $aggregates) {
            $point = ['date' => $date];
            foreach (array_keys($aggregates) as $alias) {
                $point[$alias] = (int) ($rowsByDay[$date]->{$alias} ?? 0);
            }

            return $point;
        }, $range->dates());
    }
}

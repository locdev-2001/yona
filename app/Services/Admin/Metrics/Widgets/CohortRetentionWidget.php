<?php

namespace App\Services\Admin\Metrics\Widgets;

use App\Models\Message;
use App\Services\Admin\Metrics\DateRange;
use App\Services\Admin\Metrics\MetricWidget;
use App\Services\Admin\Metrics\WidgetSize;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

// Giữ chân theo nhóm tuần đăng ký: account tuần W còn trả lời khách (tin ra,
// không tính ghi chú) ở tuần W+k hay không. Tuần tính từ thứ Hai, giờ Việt Nam.
final class CohortRetentionWidget extends MetricWidget
{
    public const WEEKS = 8;

    private const CACHE_SECONDS = 600;

    public function key(): string
    {
        return 'cohort_retention';
    }

    public function defaultSize(): WidgetSize
    {
        return WidgetSize::Large;
    }

    public function dependsOnRange(): bool
    {
        return false;
    }

    public function cacheSeconds(): int
    {
        return self::CACHE_SECONDS;
    }

    public function compute(DateRange $range): array
    {
        $currentWeek = CarbonImmutable::now(DateRange::TIMEZONE)->startOfWeek(CarbonImmutable::MONDAY)->startOfDay();
        $firstWeek = $currentWeek->subWeeks(self::WEEKS - 1);
        $since = $firstWeek->utc();

        $cohortWeekSql = "date_trunc('week', ".DateRange::localDateSql('accounts.created_at').')::date';
        $activeWeekSql = "date_trunc('week', ".DateRange::localDateSql('messages.created_at').')::date';

        $sizes = DB::table('accounts')
            ->where('created_at', '>=', $since)
            ->groupByRaw('1')
            ->selectRaw("{$cohortWeekSql} as cohort_week, count(*) as size")
            ->pluck('size', 'cohort_week');

        $activity = DB::table('messages')
            ->where('messages.created_at', '>=', $since)
            ->where('messages.message_type', Message::TYPE_OUTGOING)
            ->where('messages.private', false)
            ->selectRaw("distinct messages.account_id, {$activeWeekSql} as active_week");

        $active = DB::table('accounts')
            ->joinSub($activity, 'activity', 'activity.account_id', '=', 'accounts.id')
            ->where('accounts.created_at', '>=', $since)
            ->whereRaw("activity.active_week >= {$cohortWeekSql}")
            ->groupByRaw('1, 2')
            ->selectRaw("{$cohortWeekSql} as cohort_week, (activity.active_week - {$cohortWeekSql}) / 7 as week_offset, count(*) as active")
            ->get()
            ->groupBy(static fn (object $row) => (string) $row->cohort_week)
            ->map(static fn ($rows) => $rows->pluck('active', 'week_offset'));

        $cohorts = [];
        for ($index = 0; $index < self::WEEKS; $index++) {
            $week = $firstWeek->addWeeks($index)->format('Y-m-d');
            $size = (int) ($sizes[$week] ?? 0);
            $elapsedWeeks = self::WEEKS - $index;

            $retention = [];
            for ($offset = 0; $offset < $elapsedWeeks; $offset++) {
                $count = (int) ($active[$week][$offset] ?? 0);
                $retention[] = [
                    'offset' => $offset,
                    'active' => $count,
                    'rate' => $size === 0 ? null : round($count / $size * 100, 1),
                ];
            }

            $cohorts[] = ['week' => $week, 'size' => $size, 'retention' => $retention];
        }

        return ['weeks' => self::WEEKS, 'cohorts' => $cohorts];
    }
}

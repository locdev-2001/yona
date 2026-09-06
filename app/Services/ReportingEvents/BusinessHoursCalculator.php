<?php

namespace App\Services\ReportingEvents;

use App\Models\Inbox;
use App\Models\WorkingHour;
use Carbon\Carbon;
use Carbon\CarbonInterface;

/**
 * Port từ refs/chatwoot/app/helpers/reporting_event_helper.rb#business_hours.
 *
 * Bản gốc dựa vào gem `working_hours` (cấu hình toàn cục
 * `WorkingHours::Config.working_hours` rồi gọi `working_time_until`); ở đây tự
 * cộng phần giao giữa khoảng [from, to) với khung giờ làm việc từng ngày của
 * inbox — không có trạng thái toàn cục nên an toàn khi chạy song song.
 */
final class BusinessHoursCalculator
{
    public static function between(?Inbox $inbox, ?CarbonInterface $from, ?CarbonInterface $to): float
    {
        if ($inbox === null || ! $inbox->working_hours_enabled || $from === null || $to === null) {
            return 0.0;
        }

        $dailyRanges = self::dailyRanges($inbox);

        if ($dailyRanges === []) {
            return 0.0;
        }

        $timezone = $inbox->timezone ?: 'UTC';
        $start = Carbon::parse($from)->setTimezone($timezone);
        $end = Carbon::parse($to)->setTimezone($timezone);

        if ($end <= $start) {
            return 0.0;
        }

        $seconds = 0;

        for ($day = $start->copy()->startOfDay(); $day < $end; $day = $day->copy()->addDay()->startOfDay()) {
            $range = $dailyRanges[$day->dayOfWeek] ?? null;

            if ($range === null) {
                continue;
            }

            $open = $day->copy()->addMinutes($range[0]);
            $close = $day->copy()->addMinutes($range[1]);
            $lower = $open->greaterThan($start) ? $open : $start;
            $upper = $close->lessThan($end) ? $close : $end;

            if ($upper > $lower) {
                $seconds += $upper->getTimestamp() - $lower->getTimestamp();
            }
        }

        return (float) $seconds;
    }

    /** @return array<int, array{0: int, 1: int}> thứ trong tuần (0 = chủ nhật) → [phút mở, phút đóng] */
    private static function dailyRanges(Inbox $inbox): array
    {
        return $inbox->workingHours
            ->reject(fn (WorkingHour $workingHour) => $workingHour->closed_all_day)
            ->mapWithKeys(fn (WorkingHour $workingHour) => [
                $workingHour->day_of_week => [
                    (int) $workingHour->open_hour * 60 + (int) $workingHour->open_minutes,
                    (int) $workingHour->close_hour * 60 + (int) $workingHour->close_minutes,
                ],
            ])
            ->all();
    }
}

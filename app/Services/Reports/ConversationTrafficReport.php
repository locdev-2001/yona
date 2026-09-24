<?php

namespace App\Services\Reports;

use App\Builders\Reports\TimeseriesReportBuilder;
use App\Models\Account;
use Carbon\CarbonImmutable;

/**
 * Port từ Api::V2::Accounts::HeatmapHelper — bảng "giờ trong ngày × ngày" cho
 * CSV lưu lượng hội thoại.
 */
final class ConversationTrafficReport
{
    private const DEFAULT_DAYS_BEFORE = 6;

    public function __construct(
        private readonly Account $account,
        private readonly mixed $timezoneOffset,
        private readonly mixed $daysBefore = null,
    ) {}

    /** @return list<list<mixed>> */
    public function rows(): array
    {
        $points = $this->points();
        $dates = collect($points)->pluck('date')->unique()->sort()->values()->all();
        $rows = [['Start of the hour', ...$dates]];

        foreach (collect($points)->groupBy('hour') as $hour => $items) {
            $byDate = collect($items)->keyBy('date');
            $row = [sprintf('%02d:00', $hour)];

            foreach ($dates as $date) {
                $row[] = $byDate[$date]['value'] ?? null;
            }

            $rows[] = $row;
        }

        return $rows;
    }

    /** @return list<array{date: string, hour: int, value: mixed}> */
    private function points(): array
    {
        // HeatmapHelper tra vùng giờ bằng `ActiveSupport::TimeZone[params[:timezone_offset]]`
        // — tham số là CHUỖI nên luôn ra nil và mốc ngày rơi về UTC, trong khi
        // biểu đồ lại gộp theo múi giờ người xem. Giữ nguyên sự lệch đó.
        $until = CarbonImmutable::now('UTC')->startOfDay();
        $days = blank($this->daysBefore) ? self::DEFAULT_DAYS_BEFORE : (int) $this->daysBefore;

        $timeseries = (new TimeseriesReportBuilder($this->account, [
            'type' => ReportScope::TYPE_ACCOUNT,
            'group_by' => 'hour',
            'metric' => ReportMetricRegistry::CONVERSATIONS_COUNT,
            'business_hours' => false,
            'since' => (string) $until->subDays($days)->getTimestamp(),
            'until' => (string) $until->getTimestamp(),
            'timezone_offset' => $this->timezoneOffset,
        ]))->timeseries();

        // Bản gốc dùng `Time.at` (múi giờ máy chủ) khi tách ngày/giờ, không dùng
        // múi giờ người xem — giữ nguyên để CSV khớp bản gốc.
        return array_map(function (array $point) {
            $moment = CarbonImmutable::createFromTimestampUTC($point['timestamp'])->setTimezone(config('app.timezone'));

            return ['date' => $moment->toDateString(), 'hour' => $moment->hour, 'value' => $point['value']];
        }, $timeseries);
    }
}

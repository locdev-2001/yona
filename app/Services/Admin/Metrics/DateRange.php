<?php

namespace App\Services\Admin\Metrics;

use App\Models\Inbox;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use InvalidArgumentException;

// Khoảng ngày trọn vẹn theo giờ Việt Nam. Mốc giờ trả ra ở UTC để so thẳng với
// cột timestamp (lưu UTC) và vẫn ăn index created_at.
final class DateRange
{
    public const TIMEZONE = Inbox::DEFAULT_TIMEZONE;

    public const PRESETS = ['7d' => 7, '30d' => 30, '90d' => 90];

    public const DEFAULT_PRESET = '30d';

    public const MAX_DAYS = 366;

    private function __construct(
        public readonly CarbonImmutable $startDay,
        public readonly CarbonImmutable $endDay,
    ) {}

    public static function preset(string $preset, ?CarbonImmutable $today = null): self
    {
        $days = self::PRESETS[$preset] ?? throw new InvalidArgumentException("Unknown range preset [{$preset}].");
        $today ??= CarbonImmutable::now(self::TIMEZONE)->startOfDay();

        return new self($today->subDays($days - 1), $today);
    }

    public static function between(string $fromDate, string $toDate): self
    {
        $start = CarbonImmutable::createFromFormat('!Y-m-d', $fromDate, self::TIMEZONE);
        $end = CarbonImmutable::createFromFormat('!Y-m-d', $toDate, self::TIMEZONE);

        if ($start === false || $end === false || $end->lt($start)) {
            throw new InvalidArgumentException('Invalid date range.');
        }

        if ($start->diffInDays($end) + 1 > self::MAX_DAYS) {
            throw new InvalidArgumentException('Date range too long.');
        }

        return new self($start, $end);
    }

    public function dayCount(): int
    {
        return (int) $this->startDay->diffInDays($this->endDay) + 1;
    }

    // Kỳ liền trước, cùng độ dài, dùng để tính % chênh.
    public function previous(): self
    {
        $days = $this->dayCount();

        return new self($this->startDay->subDays($days), $this->endDay->subDays($days));
    }

    public function startsAtUtc(): CarbonImmutable
    {
        return $this->startDay->utc();
    }

    // Mốc mở (loại trừ): đầu ngày kế tiếp sau ngày cuối.
    public function endsBeforeUtc(): CarbonImmutable
    {
        return $this->endDay->addDay()->utc();
    }

    /** @return list<string> */
    public function dates(): array
    {
        return array_map(
            static fn ($day) => $day->format('Y-m-d'),
            iterator_to_array(CarbonPeriod::create($this->startDay, $this->endDay), false),
        );
    }

    public function cacheKey(): string
    {
        return $this->startDay->format('Ymd').'-'.$this->endDay->format('Ymd');
    }

    /** @return array{from: string, to: string, days: int} */
    public function toArray(): array
    {
        return [
            'from' => $this->startDay->format('Y-m-d'),
            'to' => $this->endDay->format('Y-m-d'),
            'days' => $this->dayCount(),
        ];
    }

    // Biểu thức SQL đưa cột timestamp (UTC) về ngày theo giờ Việt Nam.
    public static function localDateSql(string $column): string
    {
        return "(({$column} AT TIME ZONE 'UTC') AT TIME ZONE '".self::TIMEZONE."')::date";
    }
}

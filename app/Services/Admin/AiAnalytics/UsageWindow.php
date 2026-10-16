<?php

namespace App\Services\Admin\AiAnalytics;

use App\Services\Admin\Metrics\DateRange;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use InvalidArgumentException;

// Khoảng xem của trang Phân tích AI: 24 giờ gần nhất (tính cả giờ đang chạy), hoặc các
// ngày trọn vẹn theo giờ Việt Nam (7 ngày, 30 ngày, tuỳ chọn). Mốc trả ra ở UTC để so
// thẳng với period_start. Khoảng ngắn chia cột theo giờ, khoảng dài theo ngày.
final class UsageWindow
{
    public const LAST_DAY = '24h';

    public const CUSTOM = 'custom';

    public const PRESETS = [self::LAST_DAY, '7d', '30d', self::CUSTOM];

    public const DEFAULT_PRESET = '7d';

    public const BUCKET_HOUR = 'hour';

    public const BUCKET_DAY = 'day';

    private const HOURLY_BUCKETS_UP_TO_HOURS = 48;

    private function __construct(
        public readonly string $preset,
        public readonly CarbonImmutable $startsAt,
        public readonly CarbonImmutable $endsBefore,
        private readonly ?DateRange $days,
    ) {}

    // Khoảng không hợp lệ (ngày sai, đảo, dài quá) thì về khoảng mặc định.
    public static function resolve(?string $preset, ?string $from, ?string $to, ?CarbonImmutable $now = null): self
    {
        $now ??= CarbonImmutable::now();

        try {
            return match ($preset) {
                self::LAST_DAY => self::lastDay($now),
                self::CUSTOM => self::fromDays(self::CUSTOM, DateRange::between((string) $from, (string) $to)),
                '7d', '30d' => self::fromDays($preset, DateRange::preset($preset, $now->setTimezone(DateRange::TIMEZONE)->startOfDay())),
                default => self::resolve(self::DEFAULT_PRESET, null, null, $now),
            };
        } catch (InvalidArgumentException) {
            return self::resolve(self::DEFAULT_PRESET, null, null, $now);
        }
    }

    private static function lastDay(CarbonImmutable $now): self
    {
        $endsBefore = $now->utc()->startOfHour()->addHour();

        return new self(self::LAST_DAY, $endsBefore->subDay(), $endsBefore, null);
    }

    private static function fromDays(string $preset, DateRange $days): self
    {
        return new self($preset, $days->startsAtUtc(), $days->endsBeforeUtc(), $days);
    }

    // Kỳ liền trước, cùng độ dài.
    public function previous(): self
    {
        if ($this->days !== null) {
            return self::fromDays($this->preset, $this->days->previous());
        }

        $hours = $this->hourCount();

        return new self($this->preset, $this->startsAt->subHours($hours), $this->endsBefore->subHours($hours), null);
    }

    public function hourCount(): int
    {
        return (int) $this->startsAt->diffInHours($this->endsBefore);
    }

    public function bucket(): string
    {
        return $this->hourCount() <= self::HOURLY_BUCKETS_UP_TO_HOURS ? self::BUCKET_HOUR : self::BUCKET_DAY;
    }

    /** @return list<CarbonImmutable> đầu mỗi giờ trong khoảng, UTC */
    public function hours(): array
    {
        return array_map(
            static fn ($hour) => CarbonImmutable::instance($hour)->utc(),
            iterator_to_array(CarbonPeriod::create($this->startsAt, '1 hour', $this->endsBefore->subHour()), false),
        );
    }

    /** @return list<string> khoá cột: giờ (ISO UTC) hoặc ngày Việt Nam (Y-m-d) */
    public function bucketKeys(): array
    {
        return $this->bucket() === self::BUCKET_HOUR || $this->days === null
            ? array_map(self::hourKey(...), $this->hours())
            : $this->days->dates();
    }

    public static function hourKey(CarbonImmutable $hour): string
    {
        return $hour->utc()->toIso8601ZuluString();
    }

    /** @return array{preset: string, from: string, to: string, startsAt: string, endsBefore: string, bucket: string} */
    public function toArray(): array
    {
        $local = fn (CarbonImmutable $moment) => $moment->setTimezone(DateRange::TIMEZONE)->format('Y-m-d');

        return [
            'preset' => $this->preset,
            'from' => $local($this->startsAt),
            'to' => $local($this->endsBefore->subSecond()),
            'startsAt' => self::hourKey($this->startsAt),
            'endsBefore' => self::hourKey($this->endsBefore),
            'bucket' => $this->bucket(),
        ];
    }
}

<?php

namespace App\Services\Reports;

use Carbon\CarbonImmutable;

// Khoảng [since, until)
// nhận vào dưới dạng epoch giây.
final readonly class ReportRange
{
    public function __construct(
        public CarbonImmutable $since,
        public CarbonImmutable $until,
    ) {}

    public static function fromParams(mixed $since, mixed $until): ?self
    {
        if (blank($since) || blank($until)) {
            return null;
        }

        return new self(self::parse($since), self::parse($until));
    }

    public static function parse(mixed $value): CarbonImmutable
    {
        if ($value instanceof \DateTimeInterface) {
            return CarbonImmutable::instance($value);
        }

        return CarbonImmutable::createFromTimestampUTC((int) $value);
    }
}

<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;

// Port từ refs/chatwoot/app/helpers/date_range_helper.rb#parse_date_time —
// client gửi mốc thời gian dạng epoch giây.
final class DateRangeHelper
{
    public static function parseDateTime(mixed $value): Carbon
    {
        if ($value instanceof Carbon) {
            return $value;
        }

        if ($value instanceof CarbonImmutable || $value instanceof \DateTimeInterface) {
            return Carbon::instance($value);
        }

        return Carbon::createFromTimestampUTC((int) $value);
    }
}

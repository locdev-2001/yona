<?php

namespace App\Support;

use Illuminate\Support\Carbon;

// `as_json` của Rails cho Time: UTC, ISO8601 mili giây
// (ActiveSupport::JSON.time_precision = 3). Mọi resource in mốc thời gian dạng
// chuỗi đều đi qua đây để chỉ có một định dạng duy nhất.
final class RailsTimestamp
{
    public static function format(?Carbon $moment): ?string
    {
        return $moment?->clone()->utc()->format('Y-m-d\TH:i:s.v\Z');
    }
}

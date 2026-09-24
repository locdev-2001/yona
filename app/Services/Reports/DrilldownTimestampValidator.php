<?php

namespace App\Services\Reports;

use App\Builders\Reports\DrilldownBuilder;
use Carbon\CarbonImmutable;

final class DrilldownTimestampValidator
{
    private const TIMESTAMP_PARAMS = ['bucket_timestamp', 'since', 'until'];

    /** @param array<string, mixed> $params */
    public static function valid(array $params): bool
    {
        $timestamps = [];

        foreach (self::TIMESTAMP_PARAMS as $param) {
            $value = self::integerParam($params[$param] ?? null);

            if ($value === null) {
                return false;
            }

            $timestamps[$param] = $value;
        }

        if ($timestamps['since'] >= $timestamps['until']) {
            return false;
        }

        return self::bucketOverlapsRequestedRange($params, $timestamps);
    }

    public static function integerParam(mixed $value): ?int
    {
        return preg_match('/\A\d+\z/', (string) $value) === 1 ? (int) $value : null;
    }

    /**
     * @param  array<string, mixed>  $params
     * @param  array<string, int>  $timestamps
     */
    private static function bucketOverlapsRequestedRange(array $params, array $timestamps): bool
    {
        $timezone = TimezoneResolver::fromOffset($params['timezone_offset'] ?? null);
        $bucketStart = CarbonImmutable::createFromTimestampUTC($timestamps['bucket_timestamp'])->setTimezone($timezone);
        $bucketEnd = DrilldownBuilder::bucketEnd($bucketStart, DrilldownBuilder::groupBy($params['group_by'] ?? null));

        return $bucketStart->getTimestamp() < $timestamps['until'] && $bucketEnd->getTimestamp() > $timestamps['since'];
    }
}

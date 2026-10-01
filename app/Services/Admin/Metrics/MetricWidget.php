<?php

namespace App\Services\Admin\Metrics;

abstract class MetricWidget implements ComputesMetrics
{
    public const DEFAULT_CACHE_SECONDS = 60;

    public function dependsOnRange(): bool
    {
        return true;
    }

    public function cacheSeconds(): int
    {
        return self::DEFAULT_CACHE_SECONDS;
    }
}

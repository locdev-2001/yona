<?php

namespace App\Services\Admin\Metrics;

interface ComputesMetrics extends DashboardWidget
{
    /** @return array<string, mixed> */
    public function compute(DateRange $range): array;

    // Số không phụ thuộc khoảng ngày thì cache chung một bản cho mọi khoảng.
    public function dependsOnRange(): bool;

    public function cacheSeconds(): int;
}

<?php

namespace App\Services\Reports;

use App\Models\Account;

// Bộ tham số chung của mọi nguồn số liệu báo cáo (Reports::DataSource#initialize).
final readonly class DataSourceContext
{
    public function __construct(
        public Account $account,
        public ?string $metric = null,
        public string $dimensionType = ReportScope::TYPE_ACCOUNT,
        public mixed $dimensionId = null,
        public ?ReportScope $scope = null,
        public ?ReportRange $range = null,
        public string $groupBy = TimeseriesGrouper::DEFAULT_PERIOD,
        public mixed $timezoneOffset = null,
        public mixed $businessHours = null,
    ) {}
}

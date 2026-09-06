<?php

namespace App\Builders\Reports;

use App\Models\Account;
use App\Services\Reports\DataSource;
use App\Services\Reports\DataSourceContext;
use App\Services\Reports\ReportMetricRegistry;
use App\Services\Reports\ReportRange;
use App\Services\Reports\ReportScope;
use App\Services\Reports\TimeseriesGrouper;
use Illuminate\Support\Facades\Log;

/**
 * Gộp V2::Reports::Timeseries::{BaseTimeseriesBuilder,ReportBuilder} và
 * V2::Reports::Conversations::{BaseReportBuilder,ReportBuilder} — bốn lớp Ruby
 * chỉ để chuyển tiếp một lệnh gọi tới DataSource.
 */
final class TimeseriesReportBuilder
{
    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Account $account,
        private readonly array $params,
    ) {}

    /** @return list<array<string, mixed>>|array{} */
    public function timeseries(): array
    {
        if (! ReportMetricRegistry::supported($this->metricName())) {
            return $this->logInvalidMetric();
        }

        return $this->dataSource()->timeseries();
    }

    public function aggregateValue(): mixed
    {
        if (! ReportMetricRegistry::supported($this->metricName())) {
            return $this->logInvalidMetric();
        }

        return $this->dataSource()->aggregate();
    }

    private function dataSource(): DataSource
    {
        $dimensionType = blank($this->params['type'] ?? null) ? ReportScope::TYPE_ACCOUNT : (string) $this->params['type'];

        return DataSource::for(new DataSourceContext(
            account: $this->account,
            metric: $this->metricName(),
            dimensionType: $dimensionType,
            dimensionId: $this->params['id'] ?? null,
            scope: ReportScope::for($this->account, $dimensionType, $this->params['id'] ?? null),
            range: ReportRange::fromParams($this->params['since'] ?? null, $this->params['until'] ?? null),
            groupBy: TimeseriesGrouper::period($this->params['group_by'] ?? null),
            timezoneOffset: $this->params['timezone_offset'] ?? null,
            businessHours: $this->params['business_hours'] ?? null,
        ));
    }

    private function metricName(): ?string
    {
        $metric = $this->params['metric'] ?? null;

        return blank($metric) ? null : (string) $metric;
    }

    /** @return array{} */
    private function logInvalidMetric(): array
    {
        Log::error('ReportBuilder: Invalid metric - '.($this->params['metric'] ?? ''));

        return [];
    }
}

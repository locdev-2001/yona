<?php

namespace App\Services\Reports;

// Điểm rẽ duy nhất
// giữa nguồn thô và (về sau) nguồn rollup.
abstract class DataSource
{
    public function __construct(protected readonly DataSourceContext $context) {}

    public static function for(DataSourceContext $context): static
    {
        // TODO bản gốc: đổi sang RollupDataSource khi bật đọc từ bảng tổng hợp.
        return new RawDataSource($context);
    }

    /** @return list<array{value: mixed, timestamp: int, count?: int}> */
    abstract public function timeseries(): array;

    abstract public function aggregate(): mixed;

    /** @return array<int|string, array<string, mixed>> */
    abstract public function summary(): array;

    protected function metric(): ?ReportMetric
    {
        return ReportMetricRegistry::fetch($this->context->metric);
    }

    protected function isAverageMetric(): bool
    {
        return $this->metric()?->isAverage() ?? false;
    }

    protected function timezone(): string
    {
        return TimezoneResolver::fromOffset($this->context->timezoneOffset);
    }

    protected function useBusinessHours(): bool
    {
        return filter_var($this->context->businessHours, FILTER_VALIDATE_BOOLEAN);
    }

    protected function averageValueColumn(): string
    {
        return $this->useBusinessHours() ? 'value_in_business_hours' : 'value';
    }

    protected function scope(): ReportScope
    {
        return $this->context->scope
            ?? ReportScope::for($this->context->account, $this->context->dimensionType, $this->context->dimensionId);
    }
}

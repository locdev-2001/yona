<?php

namespace App\Builders\Reports;

use App\Models\Account;
use App\Services\Reports\DataSource;
use App\Services\Reports\DataSourceContext;
use App\Services\Reports\ReportRange;

// Port từ V2::Reports::BaseSummaryBuilder — một lượt đọc tổng hợp, mỗi lớp con
// chỉ nói mình gom theo chiều nào và trả bảng ra sao.
abstract class BaseSummaryBuilder
{
    /** @var array<int|string, array<string, mixed>> */
    protected array $rows = [];

    /** @param array<string, mixed> $params */
    public function __construct(
        protected readonly Account $account,
        protected readonly array $params,
    ) {}

    /** @return list<array<string, mixed>> */
    public function build(): array
    {
        $this->rows = $this->dataSource()->summary();

        return $this->prepareReport();
    }

    abstract protected function dimensionType(): string;

    /** @return list<array<string, mixed>> */
    abstract protected function prepareReport(): array;

    /** @return array<string, mixed> */
    protected function statsFor(int $dimensionId): array
    {
        $row = $this->rows[$dimensionId] ?? null;

        return [
            'id' => $dimensionId,
            'conversations_count' => (int) ($row['conversations_count'] ?? 0),
            'resolved_conversations_count' => (int) ($row['resolved_conversations_count'] ?? 0),
            'avg_resolution_time' => $row['avg_resolution_time'] ?? null,
            'avg_first_response_time' => $row['avg_first_response_time'] ?? null,
            'avg_reply_time' => $row['avg_reply_time'] ?? null,
        ];
    }

    private function dataSource(): DataSource
    {
        return DataSource::for(new DataSourceContext(
            account: $this->account,
            dimensionType: $this->dimensionType(),
            range: ReportRange::fromParams($this->params['since'] ?? null, $this->params['until'] ?? null),
            timezoneOffset: $this->params['timezone_offset'] ?? null,
            businessHours: $this->params['business_hours'] ?? null,
        ));
    }
}

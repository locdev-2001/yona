<?php

namespace App\Builders\Reports;

use App\Models\Account;
use App\Models\ReportingEvent;
use App\Services\Reports\ReportRange;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

// Port từ V2::Reports::FirstResponseTimeDistributionBuilder — phân bố thời gian
// phản hồi đầu tiên theo loại kênh.
final class FirstResponseTimeDistributionBuilder
{
    private const BUCKETS = [
        '0-1h' => 'count(case when value < 3600 then 1 end)',
        '1-4h' => 'count(case when value >= 3600 and value < 14400 then 1 end)',
        '4-8h' => 'count(case when value >= 14400 and value < 28800 then 1 end)',
        '8-24h' => 'count(case when value >= 28800 and value < 86400 then 1 end)',
        '24h+' => 'count(case when value >= 86400 then 1 end)',
    ];

    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Account $account,
        private readonly array $params,
    ) {}

    /** @return array<string, array<string, int>> */
    public function build(): array
    {
        $channelTypes = $this->account->inboxes()->pluck('channel_type', 'id')->all();
        $distribution = [];

        foreach ($this->aggregatedCounts() as $row) {
            $channelType = $channelTypes[$row->inbox_id] ?? null;

            if ($channelType === null) {
                continue;
            }

            $distribution[$channelType] ??= array_fill_keys(array_keys(self::BUCKETS), 0);

            foreach (array_keys(self::BUCKETS) as $index => $bucket) {
                $distribution[$channelType][$bucket] += (int) $row->{'bucket_'.$index};
            }
        }

        return $distribution;
    }

    /** @return Collection<int, object> */
    private function aggregatedCounts()
    {
        $selects = [DB::raw('inbox_id')];

        foreach (array_values(self::BUCKETS) as $index => $sql) {
            $selects[] = DB::raw("{$sql} as bucket_{$index}");
        }

        $query = ReportingEvent::query()
            ->where('account_id', $this->account->id)
            ->where('name', ReportingEvent::NAME_FIRST_RESPONSE);

        $range = ReportRange::fromParams($this->params['since'] ?? null, $this->params['until'] ?? null);

        if ($range !== null) {
            $query->where('created_at', '>=', $range->since)->where('created_at', '<', $range->until);
        }

        return $query->getQuery()->select($selects)->groupBy('inbox_id')->get();
    }
}

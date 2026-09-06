<?php

namespace App\Builders\Reports;

use App\Models\Account;
use App\Models\Conversation;
use App\Services\Reports\ReportRange;
use Illuminate\Support\Facades\DB;

// Port từ V2::Reports::ChannelSummaryBuilder — số hội thoại theo loại kênh × trạng thái.
final class ChannelSummaryBuilder
{
    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Account $account,
        private readonly array $params,
    ) {}

    /** @return array<string, array<string, int>> */
    public function build(): array
    {
        $range = ReportRange::fromParams($this->params['since'] ?? null, $this->params['until'] ?? null);

        $query = DB::table('conversations')
            ->join('inboxes', 'conversations.inbox_id', '=', 'inboxes.id')
            ->where('conversations.account_id', $this->account->id)
            ->select('inboxes.channel_type', 'conversations.status', DB::raw('count(*) as conversations_count'))
            ->groupBy('inboxes.channel_type', 'conversations.status');

        if ($range !== null) {
            $query->where('conversations.created_at', '>=', $range->since)
                ->where('conversations.created_at', '<', $range->until);
        }

        $byChannel = [];

        foreach ($query->get() as $row) {
            $status = Conversation::STATUS_NAMES[(int) $row->status] ?? null;

            if ($status !== null) {
                $byChannel[$row->channel_type][$status] = (int) $row->conversations_count;
            }
        }

        return array_map(fn (array $statusCounts) => $this->channelStats($statusCounts), $byChannel);
    }

    /**
     * @param  array<string, int>  $statusCounts
     * @return array<string, int>
     */
    private function channelStats(array $statusCounts): array
    {
        $stats = [
            'open' => $statusCounts['open'] ?? 0,
            'resolved' => $statusCounts['resolved'] ?? 0,
            'pending' => $statusCounts['pending'] ?? 0,
            'snoozed' => $statusCounts['snoozed'] ?? 0,
        ];

        return [...$stats, 'total' => array_sum($stats)];
    }
}

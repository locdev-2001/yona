<?php

namespace App\Services\Admin\Metrics\Widgets;

use App\Services\Admin\Metrics\ChannelTypes;
use App\Services\Admin\Metrics\DateRange;
use App\Services\Admin\Metrics\MetricWidget;
use App\Services\Admin\Metrics\WidgetSize;
use Illuminate\Support\Facades\DB;

final class ConversationsByChannelWidget extends MetricWidget
{
    public function __construct(private readonly ChannelTypes $channelTypes) {}

    public function key(): string
    {
        return 'conversations_by_channel';
    }

    public function defaultSize(): WidgetSize
    {
        return WidgetSize::Small;
    }

    public function compute(DateRange $range): array
    {
        $items = DB::table('conversations')
            ->join('inboxes', 'inboxes.id', '=', 'conversations.inbox_id')
            ->where('conversations.created_at', '>=', $range->startsAtUtc())
            ->where('conversations.created_at', '<', $range->endsBeforeUtc())
            ->groupBy('inboxes.channel_type')
            ->orderByDesc('total')
            ->selectRaw('inboxes.channel_type, count(*) as total')
            ->get()
            ->map(function (object $row) {
                $platform = $this->channelTypes->platform($row->channel_type);

                return [
                    'channelType' => $row->channel_type,
                    'platform' => ['key' => $platform->key, 'name' => $platform->name],
                    'count' => (int) $row->total,
                ];
            })
            ->values()
            ->all();

        return [
            'range' => $range->toArray(),
            'total' => array_sum(array_column($items, 'count')),
            'items' => $items,
        ];
    }
}

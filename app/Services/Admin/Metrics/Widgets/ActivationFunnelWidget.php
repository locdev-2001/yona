<?php

namespace App\Services\Admin\Metrics\Widgets;

use App\Models\Message;
use App\Models\User;
use App\Services\Admin\Metrics\ChannelTypes;
use App\Services\Admin\Metrics\DateRange;
use App\Services\Admin\Metrics\MetricWidget;
use App\Services\Admin\Metrics\WidgetSize;
use Illuminate\Support\Facades\DB;

// Phễu kích hoạt của các account đăng ký trong khoảng, suy ra từ dữ liệu sẵn
// có. Mỗi bước chỉ đếm account đã qua mọi bước trước để phễu luôn thu hẹp.
final class ActivationFunnelWidget extends MetricWidget
{
    private const STEPS = ['signed_up', 'created_inbox', 'connected_channel', 'received_message', 'replied'];

    public function __construct(private readonly ChannelTypes $channelTypes) {}

    public function key(): string
    {
        return 'activation_funnel';
    }

    public function defaultSize(): WidgetSize
    {
        return WidgetSize::Medium;
    }

    public function compute(DateRange $range): array
    {
        $counts = $this->stepCounts($range);
        $signedUp = $counts['signed_up'];

        $steps = [];
        $previousCount = null;
        foreach (self::STEPS as $step) {
            $count = $counts[$step];
            $steps[] = [
                'key' => $step,
                'count' => $count,
                'rateFromStart' => $this->rate($count, $signedUp),
                'rateFromPrevious' => $previousCount === null ? null : $this->rate($count, $previousCount),
            ];
            $previousCount = $count;
        }

        return ['range' => $range->toArray(), 'steps' => $steps];
    }

    /** @return array<string, int> */
    private function stepCounts(DateRange $range): array
    {
        $connectedTypes = $this->channelTypes->externallyConnectedTypes();
        $connectedCondition = $connectedTypes === []
            ? 'false'
            : 'inboxes.channel_type in ('.implode(', ', array_fill(0, count($connectedTypes), '?')).')';

        $cohort = DB::table('accounts')
            ->where('accounts.created_at', '>=', $range->startsAtUtc())
            ->where('accounts.created_at', '<', $range->endsBeforeUtc())
            ->selectRaw('exists (select 1 from inboxes where inboxes.account_id = accounts.id) as created_inbox')
            ->selectRaw(
                "exists (select 1 from inboxes where inboxes.account_id = accounts.id and {$connectedCondition}) as connected_channel",
                $connectedTypes,
            )
            ->selectRaw(
                'exists (select 1 from messages where messages.account_id = accounts.id and messages.message_type = ?) as received_message',
                [Message::TYPE_INCOMING],
            )
            ->selectRaw(
                'exists (select 1 from messages where messages.account_id = accounts.id and messages.message_type = ?'
                .' and messages.private = false and messages.sender_type = ?) as replied',
                [Message::TYPE_OUTGOING, (new User)->getMorphClass()],
            );

        $row = DB::query()->fromSub($cohort, 'cohort')->selectRaw(
            'count(*) as signed_up,'
            .' count(*) filter (where created_inbox) as created_inbox,'
            .' count(*) filter (where created_inbox and connected_channel) as connected_channel,'
            .' count(*) filter (where created_inbox and connected_channel and received_message) as received_message,'
            .' count(*) filter (where created_inbox and connected_channel and received_message and replied) as replied',
        )->first();

        return array_map('intval', (array) $row);
    }

    private function rate(int $count, int $base): ?float
    {
        return $base === 0 ? null : round($count / $base * 100, 1);
    }
}

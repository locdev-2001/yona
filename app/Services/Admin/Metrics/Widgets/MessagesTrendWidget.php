<?php

namespace App\Services\Admin\Metrics\Widgets;

use App\Models\Message;
use App\Services\Admin\Metrics\DailySeries;
use App\Services\Admin\Metrics\DateRange;
use App\Services\Admin\Metrics\MetricWidget;
use App\Services\Admin\Metrics\WidgetSize;
use Illuminate\Support\Facades\DB;

final class MessagesTrendWidget extends MetricWidget
{
    public function key(): string
    {
        return 'messages_trend';
    }

    public function defaultSize(): WidgetSize
    {
        return WidgetSize::Large;
    }

    public function compute(DateRange $range): array
    {
        $incoming = Message::TYPE_INCOMING;
        $outgoing = Message::TYPE_OUTGOING;

        return [
            'range' => $range->toArray(),
            'days' => DailySeries::count(
                DB::table('messages')->whereIn('message_type', [$incoming, $outgoing])->where('private', false),
                'created_at',
                $range,
                [
                    'incoming' => "count(*) filter (where message_type = {$incoming})",
                    'outgoing' => "count(*) filter (where message_type = {$outgoing})",
                ],
            ),
        ];
    }
}

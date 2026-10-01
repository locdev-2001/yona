<?php

namespace App\Services\Admin\Metrics\Widgets;

use App\Services\Admin\Metrics\DailySeries;
use App\Services\Admin\Metrics\DateRange;
use App\Services\Admin\Metrics\MetricWidget;
use App\Services\Admin\Metrics\WidgetSize;
use Illuminate\Support\Facades\DB;

final class SignupsTrendWidget extends MetricWidget
{
    public function key(): string
    {
        return 'signups_trend';
    }

    public function defaultSize(): WidgetSize
    {
        return WidgetSize::Medium;
    }

    public function compute(DateRange $range): array
    {
        return [
            'range' => $range->toArray(),
            'days' => DailySeries::count(DB::table('accounts'), 'created_at', $range, ['count' => 'count(*)']),
        ];
    }
}

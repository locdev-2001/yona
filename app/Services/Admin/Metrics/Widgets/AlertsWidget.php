<?php

namespace App\Services\Admin\Metrics\Widgets;

use App\Models\AlertIncident;
use App\Services\Admin\Alerts\AlertMessage;
use App\Services\Admin\Metrics\DateRange;
use App\Services\Admin\Metrics\MetricWidget;
use App\Services\Admin\Metrics\WidgetSize;
use App\Support\SuperAdminArea;

// Số sự cố cảnh báo đang mở và sự cố mới nhất, đọc từ bảng của trang Cảnh báo.
final class AlertsWidget extends MetricWidget
{
    private const CACHE_SECONDS = 30;

    public function key(): string
    {
        return 'alerts';
    }

    public function defaultSize(): WidgetSize
    {
        return WidgetSize::Small;
    }

    public function dependsOnRange(): bool
    {
        return false;
    }

    public function cacheSeconds(): int
    {
        return self::CACHE_SECONDS;
    }

    public function compute(DateRange $range): array
    {
        $latest = AlertIncident::query()->with('rule:id,key')->latest('opened_at')->latest('id')->first();

        return [
            'open' => AlertIncident::query()->open()->count(),
            'url' => SuperAdminArea::url('alerts'),
            'latest' => $latest === null ? null : [
                'id' => $latest->id,
                'ruleKey' => (string) $latest->rule?->key,
                'ruleTitle' => AlertMessage::ruleTitle((string) $latest->rule?->key),
                'value' => $latest->peak_value,
                'threshold' => $latest->threshold,
                'openedAt' => $latest->opened_at?->toIso8601String(),
                'resolvedAt' => $latest->resolved_at?->toIso8601String(),
            ],
        ];
    }
}

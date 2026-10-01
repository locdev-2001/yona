<?php

namespace App\Services\Admin\Alerts;

final class AlertValues
{
    public static function format(MetricUnit $unit, ?int $value): string
    {
        if ($value === null) {
            return (string) __('admin_alerts.VALUES.UNKNOWN');
        }

        return match ($unit) {
            MetricUnit::Count => number_format($value, 0, ',', '.'),
            MetricUnit::Seconds => (string) __('admin_alerts.VALUES.SECONDS', ['count' => number_format($value, 0, ',', '.')]),
            MetricUnit::State => (string) __($value > 0 ? 'admin_alerts.VALUES.DOWN' : 'admin_alerts.VALUES.UP'),
        };
    }
}

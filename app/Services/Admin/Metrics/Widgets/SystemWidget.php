<?php

namespace App\Services\Admin\Metrics\Widgets;

use App\Services\Admin\Metrics\DateRange;
use App\Services\Admin\Metrics\MetricWidget;
use App\Services\Admin\Metrics\WidgetSize;
use Illuminate\Support\Facades\DB;

final class SystemWidget extends MetricWidget
{
    public function key(): string
    {
        return 'system';
    }

    public function defaultSize(): WidgetSize
    {
        return WidgetSize::Small;
    }

    public function dependsOnRange(): bool
    {
        return false;
    }

    public function compute(DateRange $range): array
    {
        return [
            'version' => (string) config('yona.version'),
            'php' => PHP_VERSION,
            'laravel' => app()->version(),
            'environment' => app()->environment(),
            'databaseSizeBytes' => (int) DB::scalar('select pg_database_size(current_database())'),
            'tablesCount' => (int) DB::scalar(
                "select count(*) from information_schema.tables where table_schema = current_schema() and table_type = 'BASE TABLE'",
            ),
        ];
    }
}

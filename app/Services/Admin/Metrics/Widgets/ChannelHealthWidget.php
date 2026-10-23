<?php

namespace App\Services\Admin\Metrics\Widgets;

use App\Services\Admin\Metrics\DateRange;
use App\Services\Admin\Metrics\MetricWidget;
use App\Services\Admin\Metrics\WidgetSize;
use App\Services\Admin\Operations\ChannelHealth\ChannelHealthInspector;
use App\Support\SuperAdminArea;

// Đếm hộp thư khoẻ/hỏng từ bộ kiểm tra sức khoẻ kênh của phần vận hành.
final class ChannelHealthWidget extends MetricWidget
{
    private const ITEMS_LIMIT = 5;

    private const CACHE_SECONDS = 120;

    public function __construct(private readonly ChannelHealthInspector $inspector) {}

    public function key(): string
    {
        return 'channel_health';
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
        $summary = $this->inspector->summary();

        return [
            'total' => $summary['total'],
            'healthy' => $summary['healthy'],
            'failing' => $summary['failing'],
            'url' => SuperAdminArea::url('channel-health'),
            'items' => array_map(static fn (array $item) => [
                'inboxId' => $item['inboxId'],
                'inboxName' => $item['inboxName'],
                'accountName' => $item['accountName'],
                'platform' => $item['platform'],
                'problemLabel' => $item['problemLabel'],
                'severity' => $item['severity'] ?? null,
                'since' => $item['since'],
                'url' => $item['url'],
            ], array_slice($summary['items'], 0, self::ITEMS_LIMIT)),
        ];
    }
}

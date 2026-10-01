<?php

namespace App\Services\Admin\Metrics;

use Illuminate\Contracts\Cache\Repository as CacheRepository;

final class WidgetRegistry
{
    private const CACHE_PREFIX = 'admin_dashboard:widget:';

    private const RANGE_INDEPENDENT_CACHE_SUFFIX = 'any';

    /** @var array<string, DashboardWidget> */
    private readonly array $widgetsByKey;

    /** @param list<DashboardWidget>|null $widgets */
    public function __construct(
        private readonly CacheRepository $cache,
        ?array $widgets = null,
    ) {
        $keyed = [];
        foreach ($widgets ?? WidgetCatalog::widgets() as $widget) {
            $keyed[$widget->key()] = $widget;
        }
        $this->widgetsByKey = $keyed;
    }

    /** @return list<DashboardWidget> */
    public function all(): array
    {
        return array_values($this->widgetsByKey);
    }

    /** @return list<string> */
    public function keys(): array
    {
        return array_keys($this->widgetsByKey);
    }

    public function has(string $key): bool
    {
        return isset($this->widgetsByKey[$key]);
    }

    public function computable(string $key): ?ComputesMetrics
    {
        $widget = $this->widgetsByKey[$key] ?? null;

        return $widget instanceof ComputesMetrics ? $widget : null;
    }

    /** @return array<string, mixed> */
    public function compute(ComputesMetrics $widget, DateRange $range, bool $fresh = false): array
    {
        $suffix = $widget->dependsOnRange() ? $range->cacheKey() : self::RANGE_INDEPENDENT_CACHE_SUFFIX;
        $cacheKey = self::CACHE_PREFIX.$widget->key().':'.$suffix;

        if ($fresh) {
            $this->cache->forget($cacheKey);
        }

        return $this->cache->remember(
            $cacheKey,
            $widget->cacheSeconds(),
            static fn () => $widget->compute($range),
        );
    }
}

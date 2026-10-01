<?php

namespace App\Services\Admin\Alerts;

use App\Models\AlertRule;
use App\Services\Admin\Alerts\Metrics\FailedJobsMetric;
use App\Services\Admin\Alerts\Metrics\FailingChannelsMetric;
use App\Services\Admin\Alerts\Metrics\QueueBacklogMetric;
use App\Services\Admin\Alerts\Metrics\QueueWaitMetric;
use App\Services\Admin\Alerts\Metrics\ZaloBridgeMetric;
use Illuminate\Support\Collection;

// Danh mục chỉ số cảnh báo, cũng là nơi tạo dòng luật mặc định còn thiếu. Thứ tự
// ở đây là thứ tự trên trang Cảnh báo.
final class AlertMetrics
{
    /** @var array<string, AlertMetric> */
    private readonly array $metricsByKey;

    /** @param  list<AlertMetric>|null  $metrics */
    public function __construct(?array $metrics = null)
    {
        $keyed = [];
        foreach ($metrics ?? self::defaultMetrics() as $metric) {
            $keyed[$metric->key()] = $metric;
        }
        $this->metricsByKey = $keyed;
    }

    /** @return list<AlertMetric> */
    private static function defaultMetrics(): array
    {
        return [
            app(FailingChannelsMetric::class),
            app(FailedJobsMetric::class),
            app(QueueBacklogMetric::class),
            app(QueueWaitMetric::class),
            app(ZaloBridgeMetric::class),
        ];
    }

    /** @return list<AlertMetric> */
    public function all(): array
    {
        return array_values($this->metricsByKey);
    }

    public function find(string $key): ?AlertMetric
    {
        return $this->metricsByKey[$key] ?? null;
    }

    /**
     * Luật của mọi chỉ số đang khai, theo thứ tự danh mục; chỉ số chưa có dòng thì
     * tạo với ngưỡng mặc định. Dòng của chỉ số đã gỡ khỏi danh mục bị bỏ qua.
     *
     * @return Collection<string, AlertRule>
     */
    public function rules(): Collection
    {
        $existing = AlertRule::query()->whereIn('key', array_keys($this->metricsByKey))->get()->keyBy('key');

        return collect($this->metricsByKey)->map(function (AlertMetric $metric, string $key) use ($existing) {
            if ($existing->has($key)) {
                return $existing->get($key);
            }

            $defaults = $metric->defaults();

            return AlertRule::query()->firstOrCreate(['key' => $key], [
                'enabled' => $defaults->enabled,
                'threshold' => $defaults->threshold,
                'window_minutes' => $defaults->windowMinutes,
                'cooldown_minutes' => $defaults->cooldownMinutes,
            ]);
        });
    }
}

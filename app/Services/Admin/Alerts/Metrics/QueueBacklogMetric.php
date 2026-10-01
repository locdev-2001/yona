<?php

namespace App\Services\Admin\Alerts\Metrics;

use App\Services\Admin\Alerts\AlertMetric;
use App\Services\Admin\Alerts\AlertRuleDefaults;
use App\Services\Admin\Alerts\MetricUnit;
use App\Services\Admin\Alerts\WindowMode;
use Illuminate\Contracts\Queue\Factory as QueueFactory;

// Tổng job đang chờ (chưa bị worker nhận, không tính job hẹn giờ) trên mọi tier.
final class QueueBacklogMetric implements AlertMetric
{
    public function __construct(private readonly QueueFactory $queues) {}

    public function key(): string
    {
        return 'queue_backlog';
    }

    public function defaults(): AlertRuleDefaults
    {
        return new AlertRuleDefaults(threshold: 500, windowMinutes: 10, cooldownMinutes: 60);
    }

    public function windowMode(): WindowMode
    {
        return WindowMode::Sustain;
    }

    public function unit(): MetricUnit
    {
        return MetricUnit::Count;
    }

    public function url(): string
    {
        return '/'.trim((string) config('horizon.path', 'horizon'), '/');
    }

    public function measure(int $windowMinutes): int
    {
        $connection = $this->queues->connection();

        return array_sum(array_map(fn (string $queue) => (int) $connection->pendingSize($queue), QueueTiers::all()));
    }
}

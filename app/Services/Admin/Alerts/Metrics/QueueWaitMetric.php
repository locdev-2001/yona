<?php

namespace App\Services\Admin\Alerts\Metrics;

use App\Services\Admin\Alerts\AlertMetric;
use App\Services\Admin\Alerts\AlertRuleDefaults;
use App\Services\Admin\Alerts\MetricUnit;
use App\Services\Admin\Alerts\WindowMode;
use Illuminate\Contracts\Queue\Factory as QueueFactory;

// Job chờ lâu nhất (giây) trên mọi tier: hàng đợi ứ hay worker chết đều làm số này
// tăng dù số job chờ còn ít.
final class QueueWaitMetric implements AlertMetric
{
    public function __construct(private readonly QueueFactory $queues) {}

    public function key(): string
    {
        return 'queue_wait';
    }

    public function defaults(): AlertRuleDefaults
    {
        return new AlertRuleDefaults(threshold: 300, windowMinutes: 5, cooldownMinutes: 60);
    }

    public function windowMode(): WindowMode
    {
        return WindowMode::Sustain;
    }

    public function unit(): MetricUnit
    {
        return MetricUnit::Seconds;
    }

    public function url(): string
    {
        return '/'.trim((string) config('horizon.path', 'horizon'), '/');
    }

    public function measure(int $windowMinutes): int
    {
        $connection = $this->queues->connection();
        $now = now()->getTimestamp();
        $oldest = 0;

        foreach (QueueTiers::all() as $queue) {
            $createdAt = $connection->creationTimeOfOldestPendingJob($queue);

            if (is_numeric($createdAt)) {
                $oldest = max($oldest, $now - (int) $createdAt);
            }
        }

        return $oldest;
    }
}

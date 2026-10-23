<?php

namespace App\Services\Admin\Alerts\Metrics;

use App\Services\Admin\Alerts\AlertMetric;
use App\Services\Admin\Alerts\AlertRuleDefaults;
use App\Services\Admin\Alerts\MetricUnit;
use App\Services\Admin\Alerts\WindowMode;
use App\Services\Admin\Operations\ChannelHealth\ChannelHealthInspector;
use App\Support\SuperAdminArea;

// Số hộp thư đang hỏng toàn hệ thống, cùng nguồn với trang Sức khoẻ kênh.
final class FailingChannelsMetric implements AlertMetric
{
    public function __construct(private readonly ChannelHealthInspector $inspector) {}

    public function key(): string
    {
        return 'failing_channels';
    }

    public function defaults(): AlertRuleDefaults
    {
        return new AlertRuleDefaults(threshold: 5, windowMinutes: 10, cooldownMinutes: 60);
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
        return SuperAdminArea::url('channel-health');
    }

    public function measure(int $windowMinutes): int
    {
        return $this->inspector->summary()['failing'];
    }
}

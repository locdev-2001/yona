<?php

namespace App\Services\Admin\Alerts\Metrics;

use App\Services\Admin\Alerts\AlertMetric;
use App\Services\Admin\Alerts\AlertRuleDefaults;
use App\Services\Admin\Alerts\MetricUnit;
use App\Services\Admin\Alerts\WindowMode;
use App\Services\MessengerPersonal\BridgeClient;
use App\Support\SuperAdminArea;
use Illuminate\Support\Facades\Cache;

// Sidecar Messenger cá nhân có trả lời không: 1 = không, 0 = có. Đọc trạng thái
// monitor:check ghi mỗi phút; chưa có thì tự gọi thử `GET /`. Máy chủ chưa cấu hình
// sidecar thì luôn 0 — chưa triển khai không phải sự cố.
final class MessengerBridgeMetric implements AlertMetric
{
    // Khoá cache MonitorCheck::reportTransition('messenger-bridge', ...) ghi.
    public const MONITOR_STATE_KEY = 'monitor:state:messenger-bridge';

    public function __construct(private readonly BridgeClient $bridge) {}

    public function key(): string
    {
        return 'messenger_bridge_down';
    }

    public function defaults(): AlertRuleDefaults
    {
        return new AlertRuleDefaults(threshold: 1, windowMinutes: 5, cooldownMinutes: 30);
    }

    public function windowMode(): WindowMode
    {
        return WindowMode::Sustain;
    }

    public function unit(): MetricUnit
    {
        return MetricUnit::State;
    }

    public function url(): string
    {
        return SuperAdminArea::url('channel-health');
    }

    public function measure(int $windowMinutes): int
    {
        if (! $this->bridge->isConfigured()) {
            return 0;
        }

        $reachable = Cache::get(self::MONITOR_STATE_KEY);

        if (! is_bool($reachable)) {
            $reachable = $this->bridge->ping() !== null;
        }

        return $reachable ? 0 : 1;
    }
}

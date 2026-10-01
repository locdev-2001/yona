<?php

namespace App\Services\Admin\Alerts\Metrics;

use App\Services\Admin\Alerts\AlertMetric;
use App\Services\Admin\Alerts\AlertRuleDefaults;
use App\Services\Admin\Alerts\MetricUnit;
use App\Services\Admin\Alerts\WindowMode;
use App\Support\SuperAdminArea;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

// zalo-bridge có trả lời không: 1 = không, 0 = có. Đọc trạng thái mà monitor:check
// ghi mỗi phút (App\Console\Commands\MonitorCheck); chưa có thì tự gọi thử bridge
// đúng cách lệnh đó gọi.
final class ZaloBridgeMetric implements AlertMetric
{
    // Khoá cache MonitorCheck::reportTransition('zalo-bridge', ...) ghi.
    public const MONITOR_STATE_KEY = 'monitor:state:zalo-bridge';

    private const PROBE_TIMEOUT_SECONDS = 5;

    public function key(): string
    {
        return 'zalo_bridge_down';
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
        return SuperAdminArea::url('channel_health');
    }

    public function measure(int $windowMinutes): int
    {
        $reachable = Cache::get(self::MONITOR_STATE_KEY);

        if (! is_bool($reachable)) {
            $reachable = $this->probe();
        }

        return $reachable ? 0 : 1;
    }

    private function probe(): bool
    {
        try {
            Http::timeout(self::PROBE_TIMEOUT_SECONDS)->get((string) config('zalo.bridge.url'));

            return true;
        } catch (Throwable) {
            return false;
        }
    }
}

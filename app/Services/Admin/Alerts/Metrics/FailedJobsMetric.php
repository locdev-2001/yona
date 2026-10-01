<?php

namespace App\Services\Admin\Alerts\Metrics;

use App\Services\Admin\Alerts\AlertMetric;
use App\Services\Admin\Alerts\AlertRuleDefaults;
use App\Services\Admin\Alerts\MetricUnit;
use App\Services\Admin\Alerts\WindowMode;
use Illuminate\Support\Facades\DB;

// Job lỗi trong N phút vừa qua. Đọc bảng failed_jobs của queue failer: worker
// Horizon cũng ghi vào đó, nên đúng cả khi chạy Horizon lẫn queue:work.
final class FailedJobsMetric implements AlertMetric
{
    public function key(): string
    {
        return 'failed_jobs';
    }

    public function defaults(): AlertRuleDefaults
    {
        return new AlertRuleDefaults(threshold: 10, windowMinutes: 15, cooldownMinutes: 60);
    }

    public function windowMode(): WindowMode
    {
        return WindowMode::Lookback;
    }

    public function unit(): MetricUnit
    {
        return MetricUnit::Count;
    }

    public function url(): string
    {
        return '/'.trim((string) config('horizon.path', 'horizon'), '/').'/failed';
    }

    public function measure(int $windowMinutes): int
    {
        $failed = config('queue.failed');

        return DB::connection($failed['database'] ?? null)
            ->table($failed['table'] ?? 'failed_jobs')
            ->where('failed_at', '>=', now()->subMinutes(max(1, $windowMinutes)))
            ->count();
    }
}

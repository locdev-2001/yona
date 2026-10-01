<?php

namespace App\Services\Admin\Metrics\Widgets;

use App\Services\Admin\Metrics\DateRange;
use App\Services\Admin\Metrics\MetricWidget;
use App\Services\Admin\Metrics\WidgetSize;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Laravel\Horizon\Contracts\JobRepository;
use Laravel\Horizon\Contracts\MasterSupervisorRepository;
use Laravel\Horizon\Contracts\SupervisorRepository;
use Throwable;

// Tóm tắt hàng đợi đọc thẳng kho trạng thái của Horizon. Horizon không cài
// hoặc Redis không trả lời thì báo "không khả dụng" thay vì làm hỏng trang.
final class QueueHealthWidget extends MetricWidget
{
    public const STATUS_RUNNING = 'running';

    public const STATUS_PAUSED = 'paused';

    public const STATUS_INACTIVE = 'inactive';

    public const STATUS_UNAVAILABLE = 'unavailable';

    private const RECENT_FAILED_LIMIT = 5;

    private const CACHE_SECONDS = 15;

    public function key(): string
    {
        return 'queue_health';
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
        $dashboardUrl = '/'.trim((string) config('horizon.path', 'horizon'), '/');

        if (! interface_exists(JobRepository::class)) {
            return $this->unavailable($dashboardUrl);
        }

        try {
            return [
                'available' => true,
                'url' => $dashboardUrl,
                ...$this->horizonSnapshot(),
            ];
        } catch (Throwable $exception) {
            Log::warning('Không đọc được trạng thái Horizon cho trang Tổng quan quản trị.', ['exception' => $exception->getMessage()]);

            return $this->unavailable($dashboardUrl);
        }
    }

    /** @return array<string, mixed> */
    private function horizonSnapshot(): array
    {
        $jobs = app(JobRepository::class);
        $masters = collect(app(MasterSupervisorRepository::class)->all());
        $supervisors = collect(app(SupervisorRepository::class)->all());

        $status = match (true) {
            $masters->isEmpty() => self::STATUS_INACTIVE,
            $masters->every(static fn (object $master) => $master->status === self::STATUS_PAUSED) => self::STATUS_PAUSED,
            default => self::STATUS_RUNNING,
        };

        return [
            'status' => $status,
            'pendingJobs' => (int) $jobs->countPending(),
            'recentFailedJobs' => (int) $jobs->countRecentlyFailed(),
            'failedJobs' => (int) $jobs->countFailed(),
            'processes' => (int) $supervisors->sum(static fn (object $supervisor) => array_sum((array) $supervisor->processes)),
            'supervisors' => $supervisors->map(static fn (object $supervisor) => [
                'name' => (string) $supervisor->name,
                'status' => (string) $supervisor->status,
                'processes' => array_sum((array) $supervisor->processes),
            ])->values()->all(),
            'recentFailures' => collect($jobs->getFailed())
                ->take(self::RECENT_FAILED_LIMIT)
                ->map(static fn (object $job) => [
                    'id' => (string) $job->id,
                    'name' => (string) $job->name,
                    'queue' => (string) $job->queue,
                    'failedAt' => is_numeric($job->failed_at ?? null)
                        ? Carbon::createFromTimestamp((float) $job->failed_at)->toIso8601String()
                        : null,
                ])
                ->values()
                ->all(),
        ];
    }

    /** @return array<string, mixed> */
    private function unavailable(string $dashboardUrl): array
    {
        return [
            'available' => false,
            'url' => $dashboardUrl,
            'status' => self::STATUS_UNAVAILABLE,
            'pendingJobs' => null,
            'recentFailedJobs' => null,
            'failedJobs' => null,
            'processes' => null,
            'supervisors' => [],
            'recentFailures' => [],
        ];
    }
}

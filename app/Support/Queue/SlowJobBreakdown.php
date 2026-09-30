<?php

namespace App\Support\Queue;

use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Http\Client\Events\ResponseReceived;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Queue\Events\JobProcessed;
use Illuminate\Queue\Events\JobProcessing;
use Illuminate\Queue\Events\JobReleasedAfterException;
use Illuminate\Support\Facades\Log;

/**
 * Job chạy quá ngưỡng thì ghi một dòng log chia thời gian theo khâu: SQL, HTTP ra
 * ngoài (bridge, CDN, Web Push), phần còn lại (CPU, Redis, phát realtime qua SDK),
 * kèm thời gian chờ trong hàng đợi và thứ tự job trong tiến trình worker. Pulse chỉ
 * cho biết job chậm; dòng này cho biết chậm ở đâu.
 */
final class SlowJobBreakdown
{
    /** Cùng ngưỡng job chậm của Pulse (config/pulse.php, SlowJobs). */
    public const THRESHOLD_MS = 1000;

    public const LOG_MESSAGE = 'queue.job.slow';

    private ?int $startedAt = null;

    private float $databaseMs = 0;

    private int $databaseQueries = 0;

    private float $httpMs = 0;

    private int $httpCalls = 0;

    private int $jobsInProcess = 0;

    private function __construct(private readonly int $thresholdMs) {}

    public static function register(Dispatcher $events, int $thresholdMs = self::THRESHOLD_MS): void
    {
        $breakdown = new self($thresholdMs);

        $events->listen(JobProcessing::class, fn (JobProcessing $event) => $breakdown->start($event));
        $events->listen(QueryExecuted::class, fn (QueryExecuted $query) => $breakdown->recordQuery($query));
        $events->listen(ResponseReceived::class, fn (ResponseReceived $event) => $breakdown->recordResponse($event));
        $events->listen(
            [JobProcessed::class, JobFailed::class, JobReleasedAfterException::class],
            fn (JobProcessed|JobFailed|JobReleasedAfterException $event) => $breakdown->finish($event),
        );
    }

    private function start(JobProcessing $event): void
    {
        if ($event->connectionName === 'sync') {
            return;
        }

        $this->startedAt = hrtime(true);
        $this->databaseMs = $this->httpMs = 0;
        $this->databaseQueries = $this->httpCalls = 0;
        $this->jobsInProcess++;
    }

    private function recordQuery(QueryExecuted $query): void
    {
        if ($this->startedAt === null) {
            return;
        }

        $this->databaseMs += $query->time;
        $this->databaseQueries++;
    }

    private function recordResponse(ResponseReceived $event): void
    {
        if ($this->startedAt === null) {
            return;
        }

        $this->httpMs += ($event->response->transferStats?->getTransferTime() ?? 0) * 1000;
        $this->httpCalls++;
    }

    private function finish(JobProcessed|JobFailed|JobReleasedAfterException $event): void
    {
        if ($this->startedAt === null) {
            return;
        }

        $totalMs = (hrtime(true) - $this->startedAt) / 1e6;
        $this->startedAt = null;

        if ($totalMs < $this->thresholdMs) {
            return;
        }

        $pushedAt = $event->job->payload()['pushedAt'] ?? null;

        Log::warning(self::LOG_MESSAGE, [
            'job' => $event->job->resolveName(),
            'queue' => $event->job->getQueue(),
            'total_ms' => (int) round($totalMs),
            'db_ms' => (int) round($this->databaseMs),
            'db_queries' => $this->databaseQueries,
            'http_ms' => (int) round($this->httpMs),
            'http_calls' => $this->httpCalls,
            'other_ms' => (int) round(max(0, $totalMs - $this->databaseMs - $this->httpMs)),
            // Từ lúc đẩy vào hàng đợi tới lúc bắt đầu chạy, gồm cả thời gian hẹn trễ (delay) nếu có.
            'waited_since_push_ms' => is_numeric($pushedAt) ? (int) round((microtime(true) - (float) $pushedAt) * 1000 - $totalMs) : null,
            'job_number_in_process' => $this->jobsInProcess,
        ]);
    }
}

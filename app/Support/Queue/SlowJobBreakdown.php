<?php

namespace App\Support\Queue;

use GuzzleHttp\TransferStats;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Http\Client\Events\ResponseReceived;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Queue\Events\JobProcessed;
use Illuminate\Queue\Events\JobProcessing;
use Illuminate\Queue\Events\JobReleasedAfterException;
use Illuminate\Support\Facades\Log;
use Laravel\Pulse\Recorders\Concerns\Thresholds;
use Laravel\Pulse\Recorders\SlowJobs;

/**
 * Job chạy quá ngưỡng thì ghi một dòng log chia thời gian theo khâu: SQL, HTTP ra
 * ngoài (bridge, CDN, Web Push), phát realtime sang Reverb (SDK có Guzzle riêng, không
 * qua Http client của Laravel), phần còn lại (CPU, Redis, mở kết nối), kèm thời gian
 * chờ trong hàng đợi và thứ tự job trong tiến trình worker. Pulse chỉ cho biết job
 * chậm; dòng này cho biết chậm ở đâu.
 */
final class SlowJobBreakdown
{
    use Thresholds;

    public const LOG_MESSAGE = 'queue.job.slow';

    private ?int $startedAt = null;

    private float $databaseMs = 0;

    private int $databaseQueries = 0;

    private float $httpMs = 0;

    private int $httpCalls = 0;

    private float $broadcastMs = 0;

    private float $broadcastConnectMs = 0;

    private int $broadcastCalls = 0;

    private static ?self $instance = null;

    private int $jobsInProcess = 0;

    private function __construct(private readonly ?int $thresholdMs) {}

    public static function register(Dispatcher $events, ?int $thresholdMs = null): void
    {
        $breakdown = self::$instance = new self($thresholdMs);

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
        $this->databaseMs = $this->httpMs = $this->broadcastMs = $this->broadcastConnectMs = 0;
        $this->databaseQueries = $this->httpCalls = $this->broadcastCalls = 0;
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

    /**
     * Guzzle `on_stats` của client phát realtime (config/broadcasting.php). Phần mở
     * kết nối (DNS + TCP + TLS) tách riêng để thấy job chậm vì phải nối lại hay vì
     * Reverb trả lời chậm.
     */
    public static function recordBroadcast(TransferStats $stats): void
    {
        $breakdown = self::$instance;
        if ($breakdown === null || $breakdown->startedAt === null) {
            return;
        }

        $breakdown->broadcastMs += $stats->getTransferTime() * 1000;
        $breakdown->broadcastConnectMs += (float) ($stats->getHandlerStat('appconnect_time') ?: $stats->getHandlerStat('connect_time') ?: 0) * 1000;
        $breakdown->broadcastCalls++;
    }

    private function finish(JobProcessed|JobFailed|JobReleasedAfterException $event): void
    {
        if ($this->startedAt === null) {
            return;
        }

        $totalMs = (hrtime(true) - $this->startedAt) / 1e6;
        $this->startedAt = null;

        $jobName = $event->job->resolveName();
        $thresholdMs = $this->thresholdMs ?? $this->threshold($jobName, SlowJobs::class);

        if ($totalMs < $thresholdMs) {
            return;
        }

        $payload = $event->job->payload();
        $pushedAt = $payload['pushedAt'] ?? null;
        $delayMs = (int) ($payload['delay'] ?? 0) * 1000;

        Log::warning(self::LOG_MESSAGE, [
            'job' => $jobName,
            'queue' => $event->job->getQueue(),
            'total_ms' => (int) round($totalMs),
            'db_ms' => (int) round($this->databaseMs),
            'db_queries' => $this->databaseQueries,
            'http_ms' => (int) round($this->httpMs),
            'http_calls' => $this->httpCalls,
            'broadcast_ms' => (int) round($this->broadcastMs),
            'broadcast_connect_ms' => (int) round($this->broadcastConnectMs),
            'broadcast_calls' => $this->broadcastCalls,
            'other_ms' => (int) round(max(0, $totalMs - $this->databaseMs - $this->httpMs - $this->broadcastMs)),
            // Từ lúc tới hạn chạy (đã trừ thời gian hẹn trễ) tới lúc bắt đầu chạy.
            'waited_since_push_ms' => is_numeric($pushedAt) ? (int) round(max(0, (microtime(true) - (float) $pushedAt) * 1000 - $totalMs - $delayMs)) : null,
            'job_number_in_process' => $this->jobsInProcess,
        ]);
    }
}

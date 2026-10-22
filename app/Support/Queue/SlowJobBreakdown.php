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
use Illuminate\Redis\Events\CommandExecuted;
use Illuminate\Support\Facades\Log;
use Laravel\Pulse\Recorders\Concerns\Thresholds;
use Laravel\Pulse\Recorders\SlowJobs;

/**
 * Job chạy quá ngưỡng thì ghi một dòng log chia thời gian theo khâu: SQL, HTTP ra
 * ngoài (bridge, CDN, Web Push), phát realtime sang Reverb (SDK có Guzzle riêng, không
 * qua Http client của Laravel), Redis, thời gian CPU của tiến trình, phần còn lại (mở
 * kết nối, chờ khoá, đĩa), kèm thời gian chờ trong hàng đợi và thứ tự job trong tiến
 * trình worker. Pulse chỉ cho biết job
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

    private float $redisMs = 0;

    private int $redisCommands = 0;

    private float $cpuStartedMs = 0;

    private int $includedFilesAtStart = 0;

    private int $gcRunsAtStart = 0;

    private float $gcSecondsAtStart = 0;

    private static ?self $instance = null;

    private int $jobsInProcess = 0;

    private function __construct(private readonly ?int $thresholdMs) {}

    public static function register(Dispatcher $events, ?int $thresholdMs = null): void
    {
        $breakdown = self::$instance = new self($thresholdMs);
        app('redis')->enableEvents();

        $events->listen(JobProcessing::class, fn (JobProcessing $event) => $breakdown->start($event));
        $events->listen(QueryExecuted::class, fn (QueryExecuted $query) => $breakdown->recordQuery($query));
        $events->listen(ResponseReceived::class, fn (ResponseReceived $event) => $breakdown->recordResponse($event));
        $events->listen(CommandExecuted::class, fn (CommandExecuted $command) => $breakdown->recordRedis($command));
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
        $this->cpuStartedMs = self::cpuMs();
        $this->includedFilesAtStart = count(get_included_files());
        ['runs' => $this->gcRunsAtStart, 'collector_time' => $this->gcSecondsAtStart] = gc_status();
        $this->databaseMs = $this->httpMs = $this->broadcastMs = $this->broadcastConnectMs = $this->redisMs = 0;
        $this->databaseQueries = $this->httpCalls = $this->broadcastCalls = $this->redisCommands = 0;
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

    private function recordRedis(CommandExecuted $command): void
    {
        if ($this->startedAt === null) {
            return;
        }

        $this->redisMs += $command->time;
        $this->redisCommands++;
    }

    // CPU user + system của tiến trình: `other_ms` lớn mà `cpu_ms` nhỏ nghĩa là job đứng
    // chờ (kết nối, khoá, đĩa), không phải đang tính.
    private static function cpuMs(): float
    {
        $usage = getrusage();

        return ($usage['ru_utime.tv_sec'] + $usage['ru_stime.tv_sec']) * 1000
            + ($usage['ru_utime.tv_usec'] + $usage['ru_stime.tv_usec']) / 1000;
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
        $cpuMs = self::cpuMs() - $this->cpuStartedMs;
        $gc = gc_status();
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
            'redis_ms' => (int) round($this->redisMs),
            'redis_commands' => $this->redisCommands,
            'cpu_ms' => (int) round($cpuMs),
            // Tệp PHP nạp lần đầu trong job: nhiều nghĩa là CPU đi vào biên dịch mã (CLI không có opcache).
            'new_php_files' => count(get_included_files()) - $this->includedFilesAtStart,
            'gc_runs' => $gc['runs'] - $this->gcRunsAtStart,
            'gc_ms' => (int) round(($gc['collector_time'] - $this->gcSecondsAtStart) * 1000),
            'memory_mb' => (int) round(memory_get_usage() / 1048576),
            'other_ms' => (int) round(max(0, $totalMs - $this->databaseMs - $this->httpMs - $this->broadcastMs - $this->redisMs)),
            // Từ lúc tới hạn chạy (đã trừ thời gian hẹn trễ) tới lúc bắt đầu chạy.
            'waited_since_push_ms' => is_numeric($pushedAt) ? (int) round(max(0, (microtime(true) - (float) $pushedAt) * 1000 - $totalMs - $delayMs)) : null,
            'job_number_in_process' => $this->jobsInProcess,
        ]);
    }
}

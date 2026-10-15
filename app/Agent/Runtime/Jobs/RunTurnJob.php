<?php

namespace App\Agent\Runtime\Jobs;

use App\Agent\Runtime\TurnOrder;
use App\Agent\Runtime\TurnRunner;
use Closure;
use DateTimeImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Throwable;

// Một job một lượt, mỗi hội thoại tối đa một lượt chạy. Tranh khoá thì nhả lại và chờ
// tới `retryUntil`; lỗi thật thì hỏng ngay (maxExceptions = 1) để một lượt đã gọi mô
// hình không bao giờ chạy lại và gửi trùng. Quá giờ cũng hỏng, không thử lại.
final class RunTurnJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $maxExceptions = 1;

    public bool $failOnTimeout = true;

    /** @var (Closure(TurnOrder): void)|null Kernel gắn: failed() không được tiêm phụ thuộc */
    private static ?Closure $failureHandler = null;

    public function __construct(
        public readonly TurnOrder $order,
        public int $timeout,
        public readonly int $lockReleaseSeconds,
        public readonly int $lockExpireSeconds,
        public readonly int $waitUntil,
    ) {}

    /** @param (Closure(TurnOrder): void)|null $handler */
    public static function handleFailuresWith(?Closure $handler): void
    {
        self::$failureHandler = $handler;
    }

    /** @return list<object> */
    public function middleware(): array
    {
        return [
            (new WithoutOverlapping("ai-turn:{$this->order->conversationId}"))
                ->releaseAfter($this->lockReleaseSeconds)
                ->expireAfter($this->lockExpireSeconds),
        ];
    }

    public function retryUntil(): DateTimeImmutable
    {
        return (new DateTimeImmutable)->setTimestamp($this->waitUntil);
    }

    public function handle(TurnRunner $runner): void
    {
        $runner->run($this->order, $this->job?->uuid() ?? "{$this->order->conversationId}:{$this->order->wakeMessageId}");
    }

    public function failed(?Throwable $exception): void
    {
        if (self::$failureHandler !== null) {
            (self::$failureHandler)($this->order);
        }
    }
}

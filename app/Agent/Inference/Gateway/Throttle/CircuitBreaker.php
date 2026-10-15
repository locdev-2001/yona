<?php

namespace App\Agent\Inference\Gateway\Throttle;

use App\Agent\Inference\Gateway\Route;
use Illuminate\Contracts\Cache\Repository;
use Psr\Log\LoggerInterface;
use Throwable;

// Ngắt mạch theo tuyến (nhà cung cấp + mô hình), trạng thái trong cache dùng chung các
// worker. Đủ FAILURE_THRESHOLD lỗi trong FAILURE_WINDOW_SECONDS thì bỏ qua tuyến
// OPEN_SECONDS giây. Cache hỏng thì coi như mạch đóng: ngắt mạch chỉ để tiết kiệm.
final class CircuitBreaker
{
    private const FAILURE_THRESHOLD = 3;

    private const FAILURE_WINDOW_SECONDS = 60;

    private const OPEN_SECONDS = 30;

    private const KEY_PREFIX = 'agent:gateway:breaker:';

    public function __construct(
        private readonly Repository $cache,
        private readonly LoggerInterface $logger,
    ) {}

    public function isOpen(Route $route): bool
    {
        return $this->guard(fn () => $this->cache->has($this->key($route, 'open')), false);
    }

    public function recordFailure(Route $route): void
    {
        $this->guard(function () use ($route) {
            $failuresKey = $this->key($route, 'failures');
            $this->cache->add($failuresKey, 0, self::FAILURE_WINDOW_SECONDS);

            if ((int) $this->cache->increment($failuresKey) < self::FAILURE_THRESHOLD) {
                return;
            }

            $this->cache->put($this->key($route, 'open'), true, self::OPEN_SECONDS);
            $this->cache->forget($failuresKey);
            $this->logger->warning('agent.gateway.circuit_opened', [
                'provider' => $route->provider,
                'model' => $route->model,
                'open_seconds' => self::OPEN_SECONDS,
            ]);
        }, null);
    }

    public function recordSuccess(Route $route): void
    {
        $this->guard(fn () => $this->cache->forget($this->key($route, 'failures')), null);
    }

    /**
     * @template T
     *
     * @param  callable(): T  $operation
     * @param  T  $fallback
     * @return T
     */
    private function guard(callable $operation, mixed $fallback): mixed
    {
        try {
            return $operation();
        } catch (Throwable $exception) {
            $this->logger->warning('agent.gateway.circuit_cache_failed', ['exception' => $exception::class]);

            return $fallback;
        }
    }

    private function key(Route $route, string $suffix): string
    {
        return self::KEY_PREFIX.sha1($route->provider.'|'.$route->model).':'.$suffix;
    }
}

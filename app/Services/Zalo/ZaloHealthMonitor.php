<?php

namespace App\Services\Zalo;

use Illuminate\Support\Facades\Cache;

/**
 * Port từ App\Modules\Chat\Adapter\ZaloPersonal\Health\ZaloHealthMonitor (nhánh `main`).
 * Đếm lỗi bridge trong một cửa sổ trượt; vượt ngưỡng thì ngắt mạch để tài khoản
 * Zalo cá nhân không bị nền tảng khóa vì gửi dồn khi đang lỗi.
 */
class ZaloHealthMonitor
{
    /** @var list<string> */
    private const TRACKABLE_TYPES = ['429', '403', 'session_lost'];

    public function recordError(int $connectionId, string $type): void
    {
        if (! in_array($type, self::TRACKABLE_TYPES, true)) {
            return;
        }

        $key = $this->key($connectionId);

        if (! Cache::has($key)) {
            Cache::put($key, 1, (int) config('zalo.circuit_breaker.window_seconds'));

            return;
        }

        Cache::increment($key);
    }

    public function isCircuitOpen(int $connectionId): bool
    {
        return $this->errorCount($connectionId) >= (int) config('zalo.circuit_breaker.threshold');
    }

    public function errorCount(int $connectionId): int
    {
        return (int) Cache::get($this->key($connectionId), 0);
    }

    public function reset(int $connectionId): void
    {
        Cache::forget($this->key($connectionId));
    }

    private function key(int $connectionId): string
    {
        return "zalo_circuit:{$connectionId}:error_count";
    }
}

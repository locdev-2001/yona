<?php

namespace App\Services\MessengerPersonal;

use App\Services\Zalo\ZaloHealthMonitor;

/**
 * Cùng luật ngắt mạch và đếm lượt sidecar hỏng liên tiếp với Zalo cá nhân; chỉ khác
 * không gian khoá cache và mục cấu hình.
 */
class HealthMonitor extends ZaloHealthMonitor
{
    private const KEY_PREFIX = 'messenger_personal_circuit';

    protected function threshold(): int
    {
        return (int) config('messenger_personal.circuit_breaker.threshold', 5);
    }

    protected function windowSeconds(): int
    {
        return (int) config('messenger_personal.circuit_breaker.window_seconds', 3600);
    }

    protected function halfOpenSeconds(): int
    {
        return (int) config('messenger_personal.circuit_breaker.half_open_seconds', 300);
    }

    protected function key(int $connectionId): string
    {
        return self::KEY_PREFIX.":{$connectionId}:error_count";
    }

    protected function openedAtKey(int $connectionId): string
    {
        return self::KEY_PREFIX.":{$connectionId}:opened_at";
    }

    protected function bridgeFailureKey(int $connectionId): string
    {
        return self::KEY_PREFIX.":{$connectionId}:bridge_failures";
    }
}

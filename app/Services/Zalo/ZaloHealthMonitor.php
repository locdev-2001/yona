<?php

namespace App\Services\Zalo;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Port từ App\Modules\Chat\Adapter\ZaloPersonal\Health\ZaloHealthMonitor (nhánh `main`).
 * Đếm lỗi bridge trong một cửa sổ trượt; vượt ngưỡng thì ngắt mạch để tài khoản
 * Zalo cá nhân không bị nền tảng khóa vì gửi dồn khi đang lỗi.
 *
 * Lô 6 thêm hai thứ mà bản cũ thiếu (zalo-deep-audit 6.5):
 *  - **half-open**: mạch mở không được im lặng mãi — sau `half_open_seconds` cho
 *    một lượt thử; hỏng tiếp thì đóng lại, ngon thì `reset()` mở hẳn.
 *  - **đếm lượt hỏng liên tiếp của bridge** cho ZaloHealthSweepJob: đủ ngưỡng mới
 *    hạ trạng thái kênh, một lần lỡ nhịp không được làm inbox nhấp nháy.
 */
class ZaloHealthMonitor
{
    /** @var list<string> */
    private const TRACKABLE_TYPES = ['429', '403', 'session_lost'];

    public const STATUS_OK = 'ok';

    public const STATUS_DEGRADED = 'degraded';

    public const STATUS_HALF_OPEN = 'half_open';

    public const STATUS_OPEN = 'open';

    public function recordError(int $connectionId, string $type): void
    {
        if (! in_array($type, self::TRACKABLE_TYPES, true)) {
            return;
        }

        $key = $this->key($connectionId);

        if (! Cache::has($key)) {
            Cache::put($key, 1, $this->windowSeconds());
            Cache::put($this->openedAtKey($connectionId), now()->toIso8601String(), $this->windowSeconds());

            return;
        }

        Cache::increment($key);
    }

    /**
     * Mạch mở KHÔNG khoá vĩnh viễn: qua cửa sổ half-open thì trả `false` đúng một
     * lượt để đường gửi thử lại, và lượt thử đó dời mốc để không thử dồn dập.
     */
    public function isCircuitOpen(int $connectionId): bool
    {
        if ($this->errorCount($connectionId) < $this->threshold()) {
            return false;
        }

        if (! $this->halfOpenDue($connectionId)) {
            return true;
        }

        Cache::put($this->openedAtKey($connectionId), now()->toIso8601String(), $this->windowSeconds());

        return false;
    }

    public function errorCount(int $connectionId): int
    {
        return (int) Cache::get($this->key($connectionId), 0);
    }

    /** Thời điểm sớm nhất mạch cho thử lại — hiện trên inbox thay vì "im lặng chặn". */
    public function retryAt(int $connectionId): ?Carbon
    {
        $openedAt = $this->openedAt($connectionId);

        return $openedAt?->addSeconds($this->halfOpenSeconds());
    }

    /**
     * Trạng thái cầu nối cho giao diện: ok · chậm/lỗi lác đác · đang thử lại · đang chặn.
     *
     * @return array{status: string, error_count: int, threshold: int, retry_at: ?string}
     */
    public function status(int $connectionId): array
    {
        $count = $this->errorCount($connectionId);
        $threshold = $this->threshold();

        $status = match (true) {
            $count === 0 => self::STATUS_OK,
            $count < $threshold => self::STATUS_DEGRADED,
            $this->halfOpenDue($connectionId) => self::STATUS_HALF_OPEN,
            default => self::STATUS_OPEN,
        };

        return [
            'status' => $status,
            'error_count' => $count,
            'threshold' => $threshold,
            'retry_at' => $status === self::STATUS_OPEN ? $this->retryAt($connectionId)?->toIso8601String() : null,
        ];
    }

    public function reset(int $connectionId): void
    {
        Cache::forget($this->key($connectionId));
        Cache::forget($this->openedAtKey($connectionId));
        Cache::forget($this->bridgeFailureKey($connectionId));
    }

    /**
     * Số lượt liên tiếp bridge trả lời "không sống" cho một kênh. Trả về số lượt
     * SAU khi cộng, để ZaloHealthSweepJob so với ngưỡng.
     */
    public function recordBridgeFailure(int $connectionId): int
    {
        $key = $this->bridgeFailureKey($connectionId);
        $count = (int) Cache::get($key, 0) + 1;
        Cache::put($key, $count, $this->windowSeconds());

        return $count;
    }

    public function clearBridgeFailures(int $connectionId): void
    {
        Cache::forget($this->bridgeFailureKey($connectionId));
    }

    public function bridgeFailureCount(int $connectionId): int
    {
        return (int) Cache::get($this->bridgeFailureKey($connectionId), 0);
    }

    private function halfOpenDue(int $connectionId): bool
    {
        $openedAt = $this->openedAt($connectionId);

        return $openedAt === null || $openedAt->addSeconds($this->halfOpenSeconds())->isPast();
    }

    private function openedAt(int $connectionId): ?Carbon
    {
        $raw = Cache::get($this->openedAtKey($connectionId));

        return is_string($raw) ? Carbon::parse($raw) : null;
    }

    protected function threshold(): int
    {
        return (int) config('zalo.circuit_breaker.threshold', 5);
    }

    protected function windowSeconds(): int
    {
        return (int) config('zalo.circuit_breaker.window_seconds', 3600);
    }

    protected function halfOpenSeconds(): int
    {
        return (int) config('zalo.circuit_breaker.half_open_seconds', 300);
    }

    protected function key(int $connectionId): string
    {
        return "zalo_circuit:{$connectionId}:error_count";
    }

    protected function openedAtKey(int $connectionId): string
    {
        return "zalo_circuit:{$connectionId}:opened_at";
    }

    protected function bridgeFailureKey(int $connectionId): string
    {
        return "zalo_circuit:{$connectionId}:bridge_failures";
    }
}

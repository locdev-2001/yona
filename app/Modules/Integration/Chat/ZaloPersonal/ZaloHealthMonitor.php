<?php

namespace App\Modules\Integration\Chat\ZaloPersonal;

use Illuminate\Support\Facades\Cache;

/**
 * F8 — Circuit-breaker cho Zalo bridge errors (429/403/session_lost).
 *
 * Sliding window 1h per connection_id:
 *   - recordError(connectionId, type) → ghi error vào cache list
 *   - isCircuitOpen(connectionId) → true khi ≥5 lỗi trong 1h cuối
 *   - reset tự động sau 1h (TTL cache)
 *
 * UI fallback: ZaloSendService check circuit open → throw ZaloCircuitOpenException → UI hiện "gửi tay".
 *
 * ponytail: dùng cache increment với TTL 1h = window trượt đơn giản nhất.
 * Không chính xác 100% sliding window nhưng đủ cho MVP (upgrade Redis ZRANGEBYSCORE nếu cần chính xác).
 */
class ZaloHealthMonitor
{
    private const ERROR_THRESHOLD = 5;
    private const WINDOW_SECONDS  = 3600; // 1 hour

    private const TRACKABLE_TYPES = ['429', '403', 'session_lost', 'rate_limited', 'forbidden'];

    /**
     * Ghi nhận lỗi bridge cho connection_id.
     *
     * @param string $type Loại lỗi: '429' | '403' | 'session_lost'
     */
    public function recordError(string $connectionId, string $type): void
    {
        if (! in_array($type, self::TRACKABLE_TYPES, true)) {
            return;
        }

        $key = $this->errorCountKey($connectionId);

        if (! Cache::has($key)) {
            Cache::put($key, 1, self::WINDOW_SECONDS);
        } else {
            Cache::increment($key);
            // ponytail: TTL không reset khi increment — window 1h tính từ lần ghi đầu.
            // Đủ cho MVP; nếu cần chính xác sliding window → Redis ZRANGEBYSCORE.
        }
    }

    /**
     * True nếu circuit đang OPEN (≥5 lỗi trong cửa sổ 1h).
     * Circuit tự RESET sau 1h (TTL cache expire).
     */
    public function isCircuitOpen(string $connectionId): bool
    {
        $count = (int) Cache::get($this->errorCountKey($connectionId), 0);
        return $count >= self::ERROR_THRESHOLD;
    }

    /** Đọc số lỗi hiện tại (dùng trong test/health endpoint). */
    public function errorCount(string $connectionId): int
    {
        return (int) Cache::get($this->errorCountKey($connectionId), 0);
    }

    /** Reset thủ công circuit (sau khi kết nối lại thành công). */
    public function reset(string $connectionId): void
    {
        Cache::forget($this->errorCountKey($connectionId));
    }

    private function errorCountKey(string $connectionId): string
    {
        return "zalo_circuit:{$connectionId}:error_count";
    }
}

<?php

namespace App\Services\Zalo;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Bộ ĐẾM tin chủ động theo từng số/ngày. Không chặn gì cả.
 *
 * Quyết định founder 07/09/2026: bỏ cửa sổ giờ 7h–22h và trần 3 tin/số/ngày ra
 * khỏi đường gửi (docs/channel-capabilities.md §2.5 `messaging_window`: Yona
 * không tự đặt giới hạn tin chủ động). Số liệu vẫn ghi để dựng chính sách sau,
 * và ngắt mạch (ZaloHealthMonitor) vẫn giữ nguyên vì đó là bảo vệ kỹ thuật.
 */
class SendRateLimiter
{
    public function increment(int $accountId, string $target): void
    {
        $key = $this->cacheKey($accountId, $target);

        if (! Cache::has($key)) {
            Cache::put($key, 1, $this->secondsUntilMidnight());

            return;
        }

        Cache::increment($key);
    }

    public function currentCount(int $accountId, string $target): int
    {
        return (int) Cache::get($this->cacheKey($accountId, $target), 0);
    }

    private function cacheKey(int $accountId, string $target): string
    {
        return "zalo_rate:{$accountId}:{$target}:".$this->now()->format('Ymd');
    }

    private function secondsUntilMidnight(): int
    {
        $now = $this->now();

        return max(60, (int) $now->diffInSeconds($now->copy()->addDay()->startOfDay()));
    }

    /** Mốc ngày theo giờ Việt Nam để số liệu đọc được đúng theo ngày làm việc. */
    private function now(): Carbon
    {
        return Carbon::now((string) config('zalo.counter_timezone'));
    }
}

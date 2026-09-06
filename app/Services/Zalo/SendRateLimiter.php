<?php

namespace App\Services\Zalo;

use App\Services\Zalo\Exception\RateCapException;
use App\Services\Zalo\Exception\SendOutsideWindowException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Port từ App\Modules\Chat\Adapter\ZaloPersonal\Policy\SendRateLimiter (nhánh `main`).
 * Cửa sổ 7h–22h giờ VN + trần 3 tin/số/ngày CHỈ áp cho tin CHỦ ĐỘNG; tin trả lời
 * trong cửa sổ hội thoại là hành vi chat bình thường nên không bị chặn
 * (quyết định đã chốt trong CLAUDE.md).
 */
class SendRateLimiter
{
    public function assertCanSend(int $accountId, string $target, bool $isReply): void
    {
        if ($isReply) {
            return;
        }

        $this->assertInWindow();
        $this->assertUnderCap($accountId, $target);
    }

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

    private function assertInWindow(): void
    {
        $openHour = (int) config('zalo.send_window.open_hour');
        $closeHour = (int) config('zalo.send_window.close_hour');
        $hour = $this->now()->hour;

        if ($hour < $openHour || $hour >= $closeHour) {
            throw new SendOutsideWindowException(
                "Tin chủ động chỉ được gửi trong khung {$openHour}h–{$closeHour}h giờ Việt Nam."
            );
        }
    }

    private function assertUnderCap(int $accountId, string $target): void
    {
        $cap = (int) config('zalo.daily_promotional_cap');
        $count = $this->currentCount($accountId, $target);

        if ($count >= $cap) {
            throw new RateCapException("Đã gửi {$count} tin chủ động đến số này hôm nay, trần là {$cap} tin/ngày.");
        }
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

    private function now(): Carbon
    {
        return Carbon::now((string) config('zalo.send_window.timezone'));
    }
}

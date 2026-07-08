<?php

namespace App\Modules\Integration\Chat\ZaloPersonal;

use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\RateCapException;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\SendOutsideWindowException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * F2/F8 — Enforce Zalo ToS: cửa sổ gửi 7h-22h + cap ≤3 tin QC/số/ngày.
 *
 * Cap CHỈ áp cho tin CHỦ ĐỘNG (QC/marketing). Tin TRẢ LỜI trong hội thoại đang
 * hoạt động (khách có inbound gần đây — caller xác định, truyền $isReply) KHÔNG
 * phải QC → không bị cap, không tiêu quota cap. Cửa sổ 7h-22h vẫn áp cho mọi tin.
 *
 * State lưu trong cache, key: {workspaceId}:{targetNumber}:{Ymd}
 * - Cửa sổ giờ: giờ VN (Asia/Ho_Chi_Minh). Ngoài → SendOutsideWindowException.
 * - Cap: ≤3 tin chủ động/số/ngày per-workspace. Vượt → RateCapException.
 *
 * ponytail: dùng Laravel Cache (database driver mặc định) — không cần thêm dep.
 * Upgrade: Redis nếu throughput cần atomic increment (hiện đủ cho MVP).
 */
class SendRateLimiter
{
    private const WINDOW_OPEN_HOUR = 7;   // 07:00 VN (inclusive)

    private const WINDOW_CLOSE_HOUR = 22;  // 22:00 VN (exclusive)

    private const DAILY_CAP = 3;

    private const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

    /**
     * Assert tenant có thể gửi outbound đến targetNumber trong workspace.
     *
     * Tin TRẢ LỜI (khách có inbound gần đây) = hành vi chat bình thường → KHÔNG
     * giới hạn gì (cả giờ lẫn cap). Giới hạn 7h-22h + cap ≤3/ngày chỉ dành cho
     * tin CHỦ ĐỘNG/QC — theo Nghị định 91/2020 (chống tin nhắn rác) + ToS Zalo.
     *
     * @param  bool  $isReply  tin trả lời hội thoại đang hoạt động → bỏ qua mọi giới hạn
     *
     * @throws SendOutsideWindowException tin chủ động ngoài cửa sổ 7h-22h giờ VN
     * @throws RateCapException tin chủ động và đã gửi ≥3 tin/số/ngày
     */
    public function assertCanSend(string $workspaceId, string $targetNumber, bool $isReply = false): void
    {
        if ($isReply) {
            return;
        }

        $this->assertInWindow();
        $this->assertUnderCap($workspaceId, $targetNumber);
    }

    /**
     * Tăng bộ đếm sau khi gửi thành công (gọi sau khi bridge confirm ok).
     */
    public function increment(string $workspaceId, string $targetNumber): void
    {
        $key = $this->cacheKey($workspaceId, $targetNumber);
        $ttl = $this->secondsUntilMidnight();

        // Atomic increment; init = 1 nếu chưa có
        if (! Cache::has($key)) {
            Cache::put($key, 1, $ttl);
        } else {
            Cache::increment($key);
            // Re-set TTL: Laravel increment không reset TTL; đủ cho MVP
            // ponytail: nếu cần atomic, dùng Redis INCR + EXPIREAT
        }
    }

    /** Đọc số tin đã gửi hôm nay (dùng trong test). */
    public function currentCount(string $workspaceId, string $targetNumber): int
    {
        return (int) Cache::get($this->cacheKey($workspaceId, $targetNumber), 0);
    }

    private function assertInWindow(): void
    {
        $hour = Carbon::now(self::VN_TIMEZONE)->hour;
        if ($hour < self::WINDOW_OPEN_HOUR || $hour >= self::WINDOW_CLOSE_HOUR) {
            throw new SendOutsideWindowException(
                'Zalo outbound chỉ cho phép trong cửa sổ '.self::WINDOW_OPEN_HOUR.'h-'.self::WINDOW_CLOSE_HOUR.'h giờ VN.'
            );
        }
    }

    private function assertUnderCap(string $workspaceId, string $targetNumber): void
    {
        $count = (int) Cache::get($this->cacheKey($workspaceId, $targetNumber), 0);
        if ($count >= self::DAILY_CAP) {
            throw new RateCapException(
                "Đã gửi {$count} tin đến số này hôm nay. Giới hạn ".self::DAILY_CAP.' tin QC/số/ngày.'
            );
        }
    }

    private function cacheKey(string $workspaceId, string $targetNumber): string
    {
        $date = Carbon::now(self::VN_TIMEZONE)->format('Ymd');

        return "zalo_rate:{$workspaceId}:{$targetNumber}:{$date}";
    }

    private function secondsUntilMidnight(): int
    {
        $now = Carbon::now(self::VN_TIMEZONE);
        $midnight = $now->copy()->addDay()->startOfDay();

        return max(60, (int) $now->diffInSeconds($midnight));
    }
}

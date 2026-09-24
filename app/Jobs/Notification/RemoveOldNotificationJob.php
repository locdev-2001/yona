<?php

namespace App\Jobs\Notification;

use App\Jobs\ApplicationJob;
use App\Models\Notification;

// Dọn thông báo quá 1 tháng và cắt bớt phần vượt hạn mức của từng người dùng.
class RemoveOldNotificationJob extends ApplicationJob
{
    public const NOTIFICATION_LIMIT = 300;

    public const OLD_NOTIFICATION_MONTHS = 1;

    public function __construct()
    {
        $this->onQueue('purgable');
    }

    public function handle(): void
    {
        Notification::query()
            ->where('created_at', '<', now()->subMonths(self::OLD_NOTIFICATION_MONTHS))
            ->delete();

        foreach ($this->userIdsExceedingLimit() as $userId) {
            $this->trimNotificationsForUser((int) $userId);
        }
    }

    /** @return list<int> */
    private function userIdsExceedingLimit(): array
    {
        return Notification::query()
            ->select('user_id')
            ->groupBy('user_id')
            ->havingRaw('COUNT(*) > ?', [self::NOTIFICATION_LIMIT])
            ->pluck('user_id')
            ->map(fn ($userId) => (int) $userId)
            ->all();
    }

    // Mốc cắt = bản ghi thứ (LIMIT + 1); xóa mọi bản ghi cũ hơn mốc đó, hoặc cùng
    // mốc thời gian nhưng id nhỏ hơn — thông báo tạo sau luôn an toàn.
    private function trimNotificationsForUser(int $userId): void
    {
        $cutoff = Notification::query()
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->skip(self::NOTIFICATION_LIMIT)
            ->take(1)
            ->first(['created_at', 'id']);

        if ($cutoff === null) {
            return;
        }

        Notification::query()
            ->where('user_id', $userId)
            ->where(function ($query) use ($cutoff) {
                $query->where('created_at', '<', $cutoff->created_at)
                    ->orWhere(fn ($nested) => $nested
                        ->where('created_at', '=', $cutoff->created_at)
                        ->where('id', '<=', $cutoff->id));
            })
            ->delete();
    }
}

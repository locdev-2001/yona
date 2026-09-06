<?php

namespace App\Jobs\Notification;

use App\Jobs\ApplicationJob;
use App\Models\Notification;

// Port từ refs/chatwoot/app/jobs/notification/reopen_snoozed_notifications_job.rb —
// hết hạn hoãn thì thông báo trở lại danh sách chưa đọc.
class ReopenSnoozedNotificationsJob extends ApplicationJob
{
    public const BATCH_SIZE = 100;

    public function __construct()
    {
        $this->onQueue('low');
    }

    public function handle(): void
    {
        Notification::query()
            ->whereBetween('snoozed_until', [now()->subDays(3), now()])
            ->chunkById(self::BATCH_SIZE, function ($notifications) {
                $notifications->each(fn (Notification $notification) => $notification->update([
                    'meta' => [...($notification->meta ?? []), 'last_snoozed_at' => $notification->snoozed_until?->toISOString()],
                    'snoozed_until' => null,
                    'last_activity_at' => now(),
                    'read_at' => null,
                ]));
            });
    }
}

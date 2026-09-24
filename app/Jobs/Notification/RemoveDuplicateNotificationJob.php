<?php

namespace App\Jobs\Notification;

use App\Jobs\ApplicationJob;
use App\Models\Notification;

// Mỗi (user, hội thoại) chỉ giữ thông báo mới nhất.
class RemoveDuplicateNotificationJob extends ApplicationJob
{
    public function __construct(private readonly int $notificationId)
    {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        $notification = Notification::query()->find($this->notificationId);

        if ($notification === null) {
            return;
        }

        $duplicates = Notification::query()
            ->where('user_id', $notification->user_id)
            ->where('primary_actor_id', $notification->primary_actor_id)
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->get()
            ->skip(1);

        $duplicates->each(fn (Notification $duplicate) => $duplicate->delete());
    }
}

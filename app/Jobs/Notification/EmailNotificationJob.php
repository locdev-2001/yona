<?php

namespace App\Jobs\Notification;

use App\Jobs\ApplicationJob;
use App\Models\Notification;
use App\Services\Notification\EmailNotificationService;

class EmailNotificationJob extends ApplicationJob
{
    public function __construct(private readonly int $notificationId)
    {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        $notification = Notification::query()->find($this->notificationId);

        // Đã đọc trước khi job chạy thì thôi không gửi email nữa.
        if ($notification === null || $notification->read_at !== null) {
            return;
        }

        (new EmailNotificationService($notification))->perform();
    }
}

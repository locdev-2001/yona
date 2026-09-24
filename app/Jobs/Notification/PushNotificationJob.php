<?php

namespace App\Jobs\Notification;

use App\Jobs\ApplicationJob;
use App\Models\Notification;
use App\Services\Notification\PushNotificationService;
use App\Services\Notification\WebPushGateway;

class PushNotificationJob extends ApplicationJob
{
    public function __construct(private readonly int $notificationId)
    {
        $this->onQueue('default');
    }

    public function handle(WebPushGateway $gateway): void
    {
        $notification = Notification::query()->find($this->notificationId);

        // Đã đọc trước khi job chạy (đang mở đúng hội thoại) thì không hiện gì trên máy nữa.
        if ($notification === null || $notification->read_at !== null) {
            return;
        }

        (new PushNotificationService($notification, $gateway))->perform();
    }
}

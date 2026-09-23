<?php

namespace App\Jobs\Notification;

use App\Jobs\ApplicationJob;
use App\Models\Notification;
use App\Services\Notification\PushNotificationService;
use App\Services\Notification\WebPushGateway;

// Port từ refs/chatwoot/app/jobs/notification/push_notification_job.rb.
class PushNotificationJob extends ApplicationJob
{
    public function __construct(private readonly int $notificationId)
    {
        $this->onQueue('default');
    }

    public function handle(WebPushGateway $gateway): void
    {
        $notification = Notification::query()->find($this->notificationId);

        if ($notification === null) {
            return;
        }

        (new PushNotificationService($notification, $gateway))->perform();
    }
}

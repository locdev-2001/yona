<?php

namespace App\Notifications\Channels;

use App\Models\User;
use App\Services\Notification\PushDeliveryResult;
use App\Services\Notification\WebPushGateway;
use Illuminate\Notifications\Notification;

// Kênh Laravel Notifications gửi thông báo đẩy trình duyệt qua đúng hạ tầng của
// thông báo hội thoại (WebPushGateway + cặp khoá VAPID tự sinh + public/sw.js),
// tới mọi trình duyệt user đó đã đăng ký. Notification khai toWebPush() trả payload
// { title, body, tag, url } mà sw.js hiểu.
class WebPushChannel
{
    public function __construct(private readonly WebPushGateway $gateway) {}

    public function send(object $notifiable, Notification $notification): void
    {
        if (! $notifiable instanceof User || ! method_exists($notification, 'toWebPush') || ! $this->gateway->isAvailable()) {
            return;
        }

        /** @var array<string, string> $payload */
        $payload = $notification->toWebPush($notifiable);

        foreach ($notifiable->browserPushSubscriptions()->get() as $subscription) {
            if ($this->gateway->send($subscription, $payload, $payload['url']) === PushDeliveryResult::SubscriptionGone) {
                $subscription->delete();
            }
        }
    }
}

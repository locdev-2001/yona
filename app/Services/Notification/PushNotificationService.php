<?php

namespace App\Services\Notification;

use App\Models\Conversation;
use App\Models\Notification;
use App\Models\NotificationSubscription;
use Illuminate\Support\Str;

// Port từ refs/chatwoot/app/services/notification/push_notification_service.rb,
// phần trình duyệt (Yona không có app di động nên bỏ FCM và push relay hub).
class PushNotificationService
{
    // Web Push chở tối đa ~4 KB mỗi lượt; một tin khách dài (URL, khối chữ liền)
    // vượt ngưỡng là cả lượt đẩy bị thư viện từ chối. Máy chỉ hiện vài dòng nên
    // cắt trước khi gửi, giữ payload dưới mức mọi trình duyệt nhận được.
    private const TITLE_MAX_CHARACTERS = 150;

    public const BODY_MAX_CHARACTERS = 300;

    public function __construct(
        private readonly Notification $notification,
        private readonly WebPushGateway $gateway,
    ) {}

    public function perform(): void
    {
        if (! $this->notification->userSubscribedTo('push')) {
            return;
        }

        $conversation = $this->notification->conversation();

        if ($conversation === null) {
            return;
        }

        $subscriptions = $this->notification->user->notificationSubscriptions()
            ->where('subscription_type', NotificationSubscription::TYPE_BROWSER_PUSH)
            ->get();

        if ($subscriptions->isEmpty() || ! $this->gateway->isAvailable()) {
            return;
        }

        $payload = $this->pushMessage($conversation);

        foreach ($subscriptions as $subscription) {
            if ($this->gateway->send($subscription, $payload, $payload['url']) === PushDeliveryResult::SubscriptionGone) {
                $subscription->delete();
            }
        }
    }

    // push_message của bản gốc chỉ có title/tag/url; thêm body (push_message_body,
    // bản gốc chỉ gửi qua FCM) để thông báo trên máy nói được ai nhắn gì.
    /** @return array{title: string, body: string, tag: string, url: string, icon: string} */
    private function pushMessage(Conversation $conversation): array
    {
        return [
            'title' => Str::limit($this->notification->pushMessageTitle(), self::TITLE_MAX_CHARACTERS, '…'),
            'body' => Str::limit($this->notification->pushMessageBody(), self::BODY_MAX_CHARACTERS, '…'),
            'tag' => "{$this->notification->typeName()}_{$conversation->display_id}_{$this->notification->id}",
            'url' => route('inbox_conversation', [
                'account' => $conversation->account_id,
                'conversationId' => $conversation->display_id,
            ]),
            'icon' => url((string) config('yona.branding.logo_thumbnail')),
        ];
    }
}

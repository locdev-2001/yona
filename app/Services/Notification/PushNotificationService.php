<?php

namespace App\Services\Notification;

use App\Finders\NotificationFinder;
use App\Models\Conversation;
use App\Models\Notification;
use Illuminate\Support\Str;

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

        $subscriptions = $this->notification->user->browserPushSubscriptions()->get();

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

    // tag gom mọi thông báo của một hội thoại vào một ô trong khay (cái sau thay cái
    // trước). badge_count dùng cùng luật đếm với realtime. data mang đúng tên trường
    // của payload realtime để trình duyệt đóng thông báo khi hội thoại được đọc.
    /**
     * @return array{
     *     title: string,
     *     body: string,
     *     tag: string,
     *     url: string,
     *     icon: string,
     *     badge_count: int,
     *     data: array{account_id: int, notification_id: int, primary_actor_type: string, primary_actor_id: int},
     * }
     */
    private function pushMessage(Conversation $conversation): array
    {
        $notification = $this->notification;

        return [
            'title' => Str::limit($notification->pushMessageTitle(), self::TITLE_MAX_CHARACTERS, '…'),
            'body' => Str::limit($notification->pushMessageBody(), self::BODY_MAX_CHARACTERS, '…'),
            'tag' => "conversation_{$conversation->account_id}_{$conversation->display_id}",
            'url' => route('inbox_conversation', [
                'account' => $conversation->account_id,
                'conversationId' => $conversation->display_id,
            ]),
            'icon' => url((string) config('yona.branding.logo_thumbnail')),
            'badge_count' => (new NotificationFinder($notification->user, $notification->account))->unreadCount(),
            'data' => [
                'account_id' => $notification->account_id,
                'notification_id' => $notification->id,
                'primary_actor_type' => $notification->primary_actor_type,
                'primary_actor_id' => $notification->primary_actor_id,
            ],
        ];
    }
}

<?php

namespace App\Http\Resources;

use App\Models\Conversation;
use App\Models\Friendship;
use App\Models\Message;
use App\Models\Notification;
use App\Support\RealtimePayload;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/accounts/notifications/index.json.jbuilder.
class NotificationResource extends JsonResource
{
    /** @param iterable<Notification> $notifications */
    public static function collectionFor(iterable $notifications): array
    {
        $notifications = new EloquentCollection(collect($notifications)->values()->all());
        self::preload($notifications);

        return $notifications
            ->map(fn (Notification $notification) => (new self($notification))->toArray(request()))
            ->values()
            ->all();
    }

    /**
     * Một trang thông báo trỏ tới nhiều hội thoại và tin: nạp gộp qua đúng bộ nạp
     * của thẻ hội thoại và payload tin, thay vì dựng từng hội thoại một.
     *
     * @param  EloquentCollection<int, Notification>  $notifications
     */
    private static function preload(EloquentCollection $notifications): void
    {
        $notifications->loadMissing(['account', 'user.accountUsers', 'user.avatar', 'primaryActor', 'secondaryActor']);

        $conversations = new EloquentCollection(
            $notifications->pluck('primaryActor')->filter(fn ($actor) => $actor instanceof Conversation)->unique(fn (Conversation $conversation) => $conversation->id)->values()->all()
        );
        ConversationResource::preload($conversations);
        // Dòng nội dung thông báo đọc tin đầu tiên (tạo hội thoại) hoặc tin đến/đi cuối
        // (gán, quá hạn): nạp sẵn cùng người gửi và tệp cho cả trang.
        $conversations->loadMissing([
            'firstMessage.sender', 'firstMessage.attachments',
            'lastIncomingMessage.sender', 'lastIncomingMessage.attachments',
            'lastOutgoingMessage.sender', 'lastOutgoingMessage.attachments',
        ]);

        foreach ($notifications as $notification) {
            $primaryActor = $notification->primaryActor;
            $secondaryActor = $notification->secondaryActor;

            if ($primaryActor instanceof Conversation && $secondaryActor instanceof Message && $secondaryActor->conversation_id === $primaryActor->id) {
                $secondaryActor->setRelation('conversation', $primaryActor);
            }
        }

        MessageResource::preload(new EloquentCollection(
            $notifications->pluck('secondaryActor')->filter(fn ($actor) => $actor instanceof Message)->unique(fn (Message $message) => $message->id)->values()->all()
        ));
    }

    public function toArray(Request $request): array
    {
        /** @var Notification $notification */
        $notification = $this->resource;
        $primaryActor = $notification->primaryActor;
        $secondaryActor = $notification->secondaryActor;

        return [
            'id' => $notification->id,
            'notification_type' => $notification->typeName(),
            'push_message_title' => $notification->pushMessageTitle(),
            'push_message_body' => $notification->pushMessageBody(),
            'message_preview' => $notification->pushMessagePreview(),
            'primary_actor_type' => $notification->primary_actor_type,
            'primary_actor_id' => $notification->primary_actor_id,
            'primary_actor' => match (true) {
                $primaryActor instanceof Friendship => RealtimePayload::notificationFriendshipActor($primaryActor, $notification->friendshipCounterpart()),
                $primaryActor === null => null,
                default => ConversationResource::pushEventData($primaryActor),
            },
            'read_at' => $notification->read_at?->toISOString(),
            'secondary_actor' => $secondaryActor instanceof Message ? MessageResource::pushEventData($secondaryActor) : null,
            'user' => $notification->user === null ? null : UserResource::pushEventData($notification->user, $notification->account),
            'created_at' => $notification->created_at->getTimestamp(),
            'last_activity_at' => $notification->last_activity_at?->getTimestamp(),
            'snoozed_until' => $notification->snoozed_until?->toISOString(),
            'meta' => $notification->meta ?? [],
        ];
    }
}

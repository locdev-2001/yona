<?php

namespace App\Http\Resources;

use App\Models\Message;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/accounts/notifications/index.json.jbuilder.
class NotificationResource extends JsonResource
{
    /** @param iterable<Notification> $notifications */
    public static function collectionFor(iterable $notifications): array
    {
        return collect($notifications)
            ->map(fn (Notification $notification) => (new self($notification))->toArray(request()))
            ->values()
            ->all();
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
            'primary_actor_type' => $notification->primary_actor_type,
            'primary_actor_id' => $notification->primary_actor_id,
            'primary_actor' => $primaryActor === null ? null : ConversationResource::pushEventData($primaryActor),
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

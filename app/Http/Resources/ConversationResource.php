<?php

namespace App\Http\Resources;

use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/conversations/partials/_conversation.json.jbuilder.
// Bỏ ở B3: labels thật (B7 — cached_label_list luôn rỗng), muted qua Redis (B4 —
// luôn false), SLA (EE — sla feature tắt nên emit null như gốc), agent bot assignee.
class ConversationResource extends JsonResource
{
    /** @param iterable<Conversation> $conversations */
    public static function collectionFor(iterable $conversations): array
    {
        return collect($conversations)
            ->map(fn (Conversation $conversation) => (new self($conversation))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var Conversation $conversation */
        $conversation = $this->resource;

        $lastMessage = $conversation->messages()
            ->where('account_id', $conversation->account_id)
            ->reorder('created_at', 'desc')
            ->first();
        $lastNonActivityMessage = $conversation->lastNonActivityMessage();

        return [
            'meta' => $this->meta($conversation),
            'id' => $conversation->display_id,
            'messages' => $lastMessage === null ? [] : [MessageResource::pushEventData($lastMessage)],
            'account_id' => $conversation->account_id,
            'uuid' => $conversation->uuid,
            'additional_attributes' => $conversation->additional_attributes ?? [],
            'agent_last_seen_at' => $conversation->agent_last_seen_at?->getTimestamp() ?? 0,
            'assignee_last_seen_at' => $conversation->assignee_last_seen_at?->getTimestamp() ?? 0,
            'can_reply' => $conversation->canReply(),
            'contact_last_seen_at' => $conversation->contact_last_seen_at?->getTimestamp() ?? 0,
            'custom_attributes' => $conversation->custom_attributes ?? [],
            'inbox_id' => $conversation->inbox_id,
            'labels' => $conversation->cachedLabelListArray(),
            'muted' => false,
            'snoozed_until' => $conversation->snoozed_until?->toISOString(),
            'status' => $conversation->statusName(),
            'created_at' => $conversation->created_at->getTimestamp(),
            'updated_at' => (float) $conversation->updated_at->format('U.u'),
            'timestamp' => $conversation->last_activity_at->getTimestamp(),
            'first_reply_created_at' => $conversation->first_reply_created_at?->getTimestamp() ?? 0,
            'unread_count' => $conversation->unreadIncomingMessagesCount(),
            'last_non_activity_message' => $lastNonActivityMessage === null
                ? null
                : MessageResource::pushEventData($lastNonActivityMessage),
            'last_activity_at' => $conversation->last_activity_at->getTimestamp(),
            'priority' => $conversation->priorityName(),
            'waiting_since' => $conversation->waiting_since?->getTimestamp() ?? 0,
            'sla_policy_id' => null,
        ];
    }

    // Conversations::EventDataPresenter#push_data — cùng shape với jbuilder
    // cộng thêm channel + contact_inbox (presenter serialize cả record).
    public static function pushEventData(Conversation $conversation): array
    {
        $contactInbox = $conversation->contactInbox;

        return [
            ...(new self($conversation))->toArray(request()),
            'channel' => $conversation->inbox->channel_type,
            'contact_inbox' => $contactInbox === null ? null : [
                'id' => $contactInbox->id,
                'contact_id' => $contactInbox->contact_id,
                'inbox_id' => $contactInbox->inbox_id,
                'source_id' => $contactInbox->source_id,
                'hmac_verified' => $contactInbox->hmac_verified,
                'pubsub_token' => $contactInbox->pubsub_token,
                'created_at' => $contactInbox->created_at?->toISOString(),
                'updated_at' => $contactInbox->updated_at?->toISOString(),
            ],
        ];
    }

    private function meta(Conversation $conversation): array
    {
        $meta = [
            'sender' => (new ContactResource($conversation->contact))->toArray(request()),
            'channel' => $conversation->inbox->channel_type,
        ];

        if ($conversation->assignee !== null) {
            $meta['assignee'] = (new AgentResource($conversation->assignee, $conversation->account))->toArray(request());
            $meta['assignee_type'] = 'User';
        }

        if ($conversation->team !== null) {
            // _team.json.jbuilder.
            $meta['team'] = [
                'id' => $conversation->team->id,
                'name' => $conversation->team->name,
                'description' => $conversation->team->description,
                'allow_auto_assign' => $conversation->team->allow_auto_assign,
                'icon' => $conversation->team->icon,
                'icon_color' => $conversation->team->icon_color,
                'account_id' => $conversation->team->account_id,
                'is_member' => $conversation->team->members()->whereKey(request()->user()?->id)->exists(),
            ];
        }

        $meta['hmac_verified'] = $conversation->contactInbox?->hmac_verified;

        return $meta;
    }
}

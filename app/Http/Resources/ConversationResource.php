<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\SerializesAttributeMaps;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Support\RealtimePayload;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/conversations/partials/_conversation.json.jbuilder.
// Bỏ: SLA (EE — sla feature tắt nên emit null như gốc).
class ConversationResource extends JsonResource
{
    use SerializesAttributeMaps;

    // Quan hệ thẻ hội thoại cần — nạp một lần cho cả trang thay vì từng thẻ.
    private const CARD_RELATIONS = [
        'account',
        'inbox',
        'assignee.avatar',
        'assignee.accountUsers',
        'assigneeAgentBot',
        'contact.avatar',
        'team',
        'contactInbox',
        'latestMessage.attachments',
        'latestNonActivityMessage.attachments',
    ];

    // Người gửi tin cuối: agent cần vai trò trong account, khách cần ảnh đại diện.
    private const MESSAGE_SENDER_RELATIONS = [
        User::class => ['accountUsers', 'avatar'],
        Contact::class => ['avatar'],
    ];

    /** @var list<int>|null Nhóm người xem là thành viên, nạp sẵn khi dựng cả trang. */
    private ?array $viewerTeamIds = null;

    /** @param iterable<Conversation> $conversations */
    public static function collectionFor(iterable $conversations): array
    {
        $conversations = new EloquentCollection(collect($conversations)->values()->all());
        self::preloadCards($conversations);
        $viewerTeamIds = self::viewerTeamIds($conversations);

        return $conversations
            ->map(function (Conversation $conversation) use ($viewerTeamIds) {
                $resource = new self($conversation);
                $resource->viewerTeamIds = $viewerTeamIds;

                return $resource->toArray(request());
            })
            ->values()
            ->all();
    }

    /** @param EloquentCollection<int, Conversation> $conversations */
    private static function preloadCards(EloquentCollection $conversations): void
    {
        $withSenderRelations = fn (MorphTo $sender) => $sender->morphWith(self::MESSAGE_SENDER_RELATIONS);
        $conversations->loadMissing([
            ...self::CARD_RELATIONS,
            'latestMessage.sender' => $withSenderRelations,
            'latestNonActivityMessage.sender' => $withSenderRelations,
        ]);
        Conversation::preloadUnreadIncomingMessagesCounts($conversations);

        foreach ($conversations as $conversation) {
            $conversation->contact?->setRelation('account', $conversation->account);

            foreach ([$conversation->latestMessage, $conversation->latestNonActivityMessage] as $message) {
                $message?->setRelation('account', $conversation->account)->setRelation('inbox', $conversation->inbox);
            }
        }
    }

    /**
     * @param  EloquentCollection<int, Conversation>  $conversations
     * @return list<int>
     */
    private static function viewerTeamIds(EloquentCollection $conversations): array
    {
        $viewer = request()->user();
        $teamIds = $conversations->pluck('team_id')->filter()->unique()->values();

        if (! $viewer instanceof User || $teamIds->isEmpty()) {
            return [];
        }

        return $viewer->teams()->whereIn('teams.id', $teamIds)->pluck('teams.id')->map(fn ($id) => (int) $id)->all();
    }

    public function toArray(Request $request): array
    {
        /** @var Conversation $conversation */
        $conversation = $this->resource;

        [$lastMessage, $lastNonActivityMessage] = self::resolveLastMessages($conversation);

        return [
            'meta' => $this->meta($conversation),
            'id' => $conversation->display_id,
            'messages' => $lastMessage === null ? [] : [MessageResource::pushEventData($lastMessage)],
            'account_id' => $conversation->account_id,
            'uuid' => $conversation->uuid,
            'additional_attributes' => self::attributeMap($conversation->additional_attributes),
            'agent_last_seen_at' => $conversation->agent_last_seen_at?->getTimestamp() ?? 0,
            'assignee_last_seen_at' => $conversation->assignee_last_seen_at?->getTimestamp() ?? 0,
            'can_reply' => $conversation->canReply(),
            'contact_last_seen_at' => $conversation->contact_last_seen_at?->getTimestamp() ?? 0,
            'custom_attributes' => self::attributeMap($conversation->custom_attributes),
            'inbox_id' => $conversation->inbox_id,
            'labels' => $conversation->cachedLabelListArray(),
            'muted' => $conversation->isMuted(),
            'snoozed_until' => $conversation->snoozed_until?->toISOString(),
            'status' => $conversation->statusName(),
            'created_at' => $conversation->created_at?->getTimestamp() ?? 0,
            'updated_at' => (float) $conversation->updated_at->format('U.u'),
            'timestamp' => $conversation->last_activity_at?->getTimestamp() ?? 0,
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
    // Khác REST (toArray không đổi): messages[0]/last_non_activity_message đổi sang
    // bản xem trước rút gọn và dùng CHUNG một bản khi cùng là một tin — REST
    // (ConversationResource::collection, jbuilder cũ) vẫn nhận đủ MessageResource::pushEventData.
    public static function pushEventData(Conversation $conversation): array
    {
        $contactInbox = $conversation->contactInbox;
        $data = (new self($conversation))->toArray(request());
        [$lastMessage, $lastNonActivityMessage] = self::resolveLastMessages($conversation);

        $nonActivityPreview = $lastNonActivityMessage === null ? null : RealtimePayload::messagePreview($lastNonActivityMessage);
        $lastMessagePreview = match (true) {
            $lastMessage === null => null,
            $lastNonActivityMessage !== null && $lastMessage->is($lastNonActivityMessage) => $nonActivityPreview,
            default => RealtimePayload::messagePreview($lastMessage),
        };

        $data['messages'] = $lastMessagePreview === null ? [] : [$lastMessagePreview];
        $data['last_non_activity_message'] = $nonActivityPreview;

        return [
            ...$data,
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

    /** @return array{0: ?Message, 1: ?Message} */
    private static function resolveLastMessages(Conversation $conversation): array
    {
        // Ngoài danh sách (sự kiện realtime, chạy mỗi tin mới) đọc mới bằng index + LIMIT 1;
        // truy vấn gộp của quan hệ ofMany chỉ đáng khi nạp cho cả trang.
        $lastMessage = $conversation->relationLoaded('latestMessage')
            ? $conversation->latestMessage
            : $conversation->messagesNewestFirst()->first();
        $lastNonActivityMessage = $conversation->relationLoaded('latestNonActivityMessage')
            ? $conversation->latestNonActivityMessage
            : $conversation->lastNonActivityMessage();

        return [$lastMessage, $lastNonActivityMessage];
    }

    private function meta(Conversation $conversation): array
    {
        $meta = [
            'sender' => (new ContactResource($conversation->contact))->toArray(request()),
            'channel' => $conversation->inbox->channel_type,
        ];

        // assigned_entity = assignee_agent_bot || assignee — bot đứng trước người.
        if ($conversation->assigneeAgentBot !== null) {
            $meta['assignee'] = AgentBotResource::slim($conversation->assigneeAgentBot);
            $meta['assignee_type'] = 'AgentBot';
        } elseif ($conversation->assignee !== null) {
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
                'is_member' => $this->viewerTeamIds !== null
                    ? in_array($conversation->team->id, $this->viewerTeamIds, true)
                    : $conversation->team->members()->whereKey(request()->user()?->id)->exists(),
            ];
        }

        $meta['hmac_verified'] = $conversation->contactInbox?->hmac_verified;

        return $meta;
    }

    // Nguồn duy nhất nằm ở Conversation::webhookData(); resource chỉ chuyển tiếp
    // để chỗ gọi cũ (listener, MessageResource) không phải đổi.
    public static function webhookData(Conversation $conversation): array
    {
        return $conversation->webhookData();
    }
}

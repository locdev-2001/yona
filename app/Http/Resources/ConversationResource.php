<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\SerializesAttributeMaps;
use App\Models\Conversation;
use App\Models\ConversationPin;
use App\Models\Message;
use App\Models\User;
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

    /** @var list<int>|null Nhóm người xem là thành viên, nạp sẵn khi dựng cả trang. */
    private ?array $viewerTeamIds = null;

    // Ghim là của riêng người xem: false khi payload không dựng cho một người cụ thể
    // (realtime, webhook) thì bỏ hẳn cờ `pinned`/`pin_position` để client giữ giá trị đang có.
    private bool $knowsViewerPins = false;

    private ?int $viewerPinPosition = null;

    /** @param iterable<Conversation> $conversations */
    public static function collectionFor(iterable $conversations): array
    {
        $conversations = new EloquentCollection(collect($conversations)->values()->all());
        self::preload($conversations);
        $viewerTeamIds = self::viewerTeamIds($conversations);
        $viewerPinPositions = self::viewerPinPositions($conversations);

        return $conversations
            ->map(function (Conversation $conversation) use ($viewerTeamIds, $viewerPinPositions) {
                $resource = new self($conversation);
                $resource->viewerTeamIds = $viewerTeamIds;
                $resource->rememberViewerPins($viewerPinPositions);

                return $resource->toArray(request());
            })
            ->values()
            ->all();
    }

    // Một hội thoại trả cho chính người đang gọi (show, update…): kèm cờ ghim của người đó.
    public static function forViewer(Conversation $conversation, Request $request): array
    {
        $resource = new self($conversation);
        $resource->rememberViewerPins(self::viewerPinPositions(new EloquentCollection([$conversation])));

        return $resource->toArray($request);
    }

    /** @param array<int, int>|null $viewerPinPositions */
    private function rememberViewerPins(?array $viewerPinPositions): void
    {
        $this->knowsViewerPins = $viewerPinPositions !== null;
        $this->viewerPinPosition = $viewerPinPositions[$this->resource->id] ?? null;
    }

    /**
     * @param  EloquentCollection<int, Conversation>  $conversations
     * @return array<int, int>|null vị trí ghim của người xem theo khoá chính hội thoại
     */
    private static function viewerPinPositions(EloquentCollection $conversations): ?array
    {
        $viewer = request()->user();
        $first = $conversations->first();

        if (! $viewer instanceof User || $first === null) {
            return null;
        }

        return ConversationPin::positionsPinnedBy($viewer, $first->account_id, $conversations->modelKeys());
    }

    /**
     * Nạp một lần cho cả nhóm hội thoại mọi quan hệ thẻ cần, để dựng N thẻ không
     * thành N lượt truy vấn cho từng quan hệ. Dùng chung cho danh sách hội thoại
     * và mọi nơi dựng nhiều hội thoại một lượt (thông báo…).
     *
     * @param  EloquentCollection<int, Conversation>  $conversations
     */
    public static function preload(EloquentCollection $conversations): void
    {
        $withSenderRelations = fn (MorphTo $sender) => $sender->morphWith(MessageResource::SENDER_RELATIONS);
        $conversations->loadMissing([
            ...self::CARD_RELATIONS,
            'latestMessage.sender' => $withSenderRelations,
            'latestNonActivityMessage.sender' => $withSenderRelations,
        ]);
        Conversation::preloadUnreadIncomingMessagesCounts($conversations);
        self::preloadThreadLastMessages($conversations, $withSenderRelations);

        foreach ($conversations as $conversation) {
            $conversation->contact?->setRelation('account', $conversation->account);

            foreach ([$conversation->latestMessage, $conversation->latestNonActivityMessage] as $message) {
                self::shareParentRelations($message, $conversation);
            }
        }
    }

    /**
     * Dòng riêng của luồng dùng chung không có tin của chính nó: tin cuối lấy từ hội thoại
     * gốc, nạp một lượt cho mọi dòng trong trang. Người đã rời nhóm thì đọc tới mốc rời.
     *
     * @param  EloquentCollection<int, Conversation>  $conversations
     */
    private static function preloadThreadLastMessages(EloquentCollection $conversations, \Closure $withSenderRelations): void
    {
        $views = $conversations->filter(fn (Conversation $conversation) => $conversation->isThreadView());

        if ($views->isEmpty()) {
            return;
        }

        $views->loadMissing(['threadMembership.group.avatarMembers', 'threadMembership.group.avatar']);
        $threads = Conversation::query()
            ->whereIn('id', $views->pluck('thread_conversation_id')->unique())
            ->with([
                'latestMessage.attachments',
                'latestNonActivityMessage.attachments',
                'latestMessage.sender' => $withSenderRelations,
                'latestNonActivityMessage.sender' => $withSenderRelations,
            ])
            ->get()
            ->keyBy('id');

        foreach ($views as $view) {
            if ($view->threadMembership?->left_at !== null) {
                $view->setRelation('latestMessage', $view->messagesNewestFirst()->first());
                $view->setRelation('latestNonActivityMessage', $view->lastNonActivityMessage());
            } else {
                $thread = $threads[$view->thread_conversation_id] ?? null;
                $view->setRelation('latestMessage', $thread?->latestMessage);
                $view->setRelation('latestNonActivityMessage', $thread?->latestNonActivityMessage);
            }

            foreach (['latestMessage', 'latestNonActivityMessage'] as $relation) {
                $message = $view->getRelation($relation);
                $view->setRelation($relation, $message === null ? null : $view->presentMessage($message));
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
            'group' => YonaGroupResource::summaryFor($conversation),
            'last_non_activity_message' => $lastNonActivityMessage === null
                ? null
                : MessageResource::pushEventData($lastNonActivityMessage),
            'last_activity_at' => $conversation->last_activity_at->getTimestamp(),
            'priority' => $conversation->priorityName(),
            'waiting_since' => $conversation->waiting_since?->getTimestamp() ?? 0,
            'sla_policy_id' => null,
            ...($this->knowsViewerPins ? ['pinned' => $this->viewerPinPosition !== null, 'pin_position' => $this->viewerPinPosition] : []),
        ];
    }

    // Conversations::EventDataPresenter#push_data — cùng shape với jbuilder cộng
    // thêm channel + contact_inbox. Nguồn ĐẦY ĐỦ dùng chung cho webhook, REST
    // (NotificationResource) và Reverb — bản rút gọn cho riêng Reverb nằm ở
    // RealtimePayload::conversation().
    public static function pushEventData(Conversation $conversation): array
    {
        $contactInbox = $conversation->contactInbox;
        $data = (new self($conversation))->toArray(request());

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
        if ($conversation->relationLoaded('latestMessage') && $conversation->relationLoaded('latestNonActivityMessage')) {
            return [$conversation->latestMessage, $conversation->latestNonActivityMessage];
        }

        $newest = $conversation->messagesNewestFirst()->first();
        $lastMessage = $newest === null ? null : $conversation->presentMessage($newest);
        // Tin mới nhất đã không phải hoạt động thì chính nó là tin cuối không-hoạt-động.
        $lastNonActivityMessage = $lastMessage !== null
            && $lastMessage->message_type !== Message::TYPE_ACTIVITY
            && $lastMessage->account_id === $conversation->account_id
                ? $lastMessage
                : $conversation->lastNonActivityMessage();

        foreach ([$lastMessage, $lastNonActivityMessage] as $message) {
            self::shareParentRelations($message, $conversation);
        }

        return [$lastMessage, $lastNonActivityMessage];
    }

    // Payload một tin của hội thoại đã dựng trong cùng trang (vd tin khớp của ô
    // tìm): dùng chung cha đã nạp, không tra lại hội thoại, account, hộp thư.
    public static function messagePayloadFor(Message $message, Conversation $conversation): array
    {
        self::shareParentRelations($message, $conversation);

        return MessageResource::pushEventData($message);
    }

    // Tin đọc từ hội thoại mang sẵn cha của nó: dựng payload tin không tra lại hội thoại, account, inbox.
    private static function shareParentRelations(?Message $message, Conversation $conversation): void
    {
        if ($message === null) {
            return;
        }

        $message->setRelation('conversation', $conversation);

        if ($message->account_id === $conversation->account_id) {
            $message->setRelation('account', $conversation->account);
            MessageResource::shareSenderAccount($message);
        }

        if ($message->inbox_id === $conversation->inbox_id) {
            $message->setRelation('inbox', $conversation->inbox);
        }
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

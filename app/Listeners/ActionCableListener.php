<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Finders\NotificationFinder;
use App\Http\Resources\ContactResource;
use App\Http\Resources\MessageResource;
use App\Http\Resources\UserResource;
use App\Jobs\ActionCableBroadcastJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AgentBot;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\Conversations\UnreadCounts\AttentionCounter;
use App\Support\RealtimePayload;
use Illuminate\Support\Str;

// Gom token người nghe rồi đẩy ActionCableBroadcastJob (queue critical). Chạy đồng bộ
// trong request như SyncDispatcher. Laravel tự đăng ký qua event discovery
// (handle(DomainEvent)) — KHÔNG Event::listen thêm, kẻo mỗi event bắn 2 lần.
class ActionCableListener extends BaseListener
{
    public function handle(DomainEvent $event): void
    {
        $method = Str::camel($event->methodName());

        if (method_exists($this, $method)) {
            $this->{$method}($event);
        }
    }

    public function accountCacheInvalidated(DomainEvent $event): void
    {
        $account = $event->data['account'];
        $tokens = $this->userTokens($account, $account->users()->get());

        $this->broadcast($account, $tokens, EventType::ACCOUNT_CACHE_INVALIDATED, [
            'cache_keys' => $event->data['cache_keys'],
        ]);
    }

    public function messageCreated(DomainEvent $event): void
    {
        [$message, $account] = $this->extractMessageAndAccount($event);
        $conversation = $message->conversation;
        $tokens = [
            ...$this->userTokens($account, $conversation->inbox->members()->get()),
            ...$this->contactTokens($conversation->contactInbox, $message),
        ];

        $this->broadcast($account, $tokens, EventType::MESSAGE_CREATED, MessageResource::pushEventData($message));
    }

    public function messageUpdated(DomainEvent $event): void
    {
        [$message, $account] = $this->extractMessageAndAccount($event);
        $conversation = $message->conversation;
        $tokens = [
            ...$this->userTokens($account, $conversation->inbox->members()->get()),
            ...$this->contactTokens($conversation->contactInbox, $message),
        ];

        $this->broadcast($account, $tokens, EventType::MESSAGE_UPDATED, [
            ...MessageResource::pushEventData($message),
            'previous_changes' => $event->data['previous_changes'] ?? null,
        ]);
    }

    public function firstReplyCreated(DomainEvent $event): void
    {
        [$message, $account] = $this->extractMessageAndAccount($event);
        $tokens = $this->userTokens($account, $message->conversation->inbox->members()->get());

        $this->broadcast($account, $tokens, EventType::FIRST_REPLY_CREATED, MessageResource::pushEventData($message));
    }

    public function conversationCreated(DomainEvent $event): void
    {
        $this->broadcastConversationToMembersAndContact($event, EventType::CONVERSATION_CREATED);
    }

    public function conversationRead(DomainEvent $event): void
    {
        $this->broadcastConversationToMembers($event, EventType::CONVERSATION_READ);
    }

    // Payload rỗng như bản gốc: client nhận tín hiệu rồi tự gọi lại
    // GET /conversations/unread_counts. Cùng cổng cờ tính năng với endpoint đó.
    public function conversationUnreadCountChanged(DomainEvent $event): void
    {
        [$conversation, $account] = $this->extractConversationAndAccount($event);

        if (! $account->featureEnabled('conversation_unread_counts')) {
            return;
        }

        $this->broadcast(
            $account,
            $this->userTokens($account, $conversation->inbox->members()->get()),
            EventType::CONVERSATION_UNREAD_COUNT_CHANGED,
            []
        );
    }

    public function conversationStatusChanged(DomainEvent $event): void
    {
        $this->broadcastConversationToMembersAndContact($event, EventType::CONVERSATION_STATUS_CHANGED);
    }

    public function conversationUpdated(DomainEvent $event): void
    {
        $this->broadcastConversationToMembersAndContact($event, EventType::CONVERSATION_UPDATED);
    }

    public function conversationFloorChanged(DomainEvent $event): void
    {
        $this->broadcastConversationToMembers($event, EventType::CONVERSATION_FLOOR_CHANGED);
    }

    public function conversationTypingOn(DomainEvent $event): void
    {
        $this->broadcastTyping($event, EventType::CONVERSATION_TYPING_ON);
    }

    public function conversationTypingOff(DomainEvent $event): void
    {
        $this->broadcastTyping($event, EventType::CONVERSATION_TYPING_OFF);
    }

    public function assigneeChanged(DomainEvent $event): void
    {
        $this->broadcastConversationToMembers($event, EventType::ASSIGNEE_CHANGED);
    }

    public function teamChanged(DomainEvent $event): void
    {
        $this->broadcastConversationToMembers($event, EventType::TEAM_CHANGED);
    }

    public function conversationContactChanged(DomainEvent $event): void
    {
        $this->broadcastConversationToMembers($event, EventType::CONVERSATION_CONTACT_CHANGED);
    }

    public function contactCreated(DomainEvent $event): void
    {
        $this->broadcastContactToAccount($event, EventType::CONTACT_CREATED);
    }

    public function contactUpdated(DomainEvent $event): void
    {
        $this->broadcastContactToAccount($event, EventType::CONTACT_UPDATED);
    }

    public function contactMerged(DomainEvent $event): void
    {
        $this->broadcastContactToAccount($event, EventType::CONTACT_MERGED);
    }

    public function contactDeleted(DomainEvent $event): void
    {
        $contactData = $event->data['contact_data'];
        $account = Account::query()->find($contactData['account_id'] ?? null);

        if ($account === null) {
            return;
        }

        $this->broadcast($account, [$this->accountToken($account)], EventType::CONTACT_DELETED, $contactData);
    }

    public function notificationCreated(DomainEvent $event): void
    {
        $this->broadcastNotification($event, EventType::NOTIFICATION_CREATED);
    }

    public function notificationUpdated(DomainEvent $event): void
    {
        $this->broadcastNotification($event, EventType::NOTIFICATION_UPDATED);
    }

    // Bản ghi đã bị xóa nên payload chỉ còn id + bộ đếm tính lại từ finder.
    public function notificationDeleted(DomainEvent $event): void
    {
        $notificationData = $event->data['notification_data'];
        $user = User::query()->find($notificationData['user_id'] ?? null);
        $account = Account::query()->find($notificationData['account_id'] ?? null);

        if ($user === null || $account === null) {
            return;
        }

        $finder = new NotificationFinder($user, $account);

        $this->broadcast($account, [$user->pubsub_token], EventType::NOTIFICATION_DELETED, [
            'notification' => ['id' => $notificationData['id']],
            ...(new AttentionCounter($account, $user))->payload(),
            'count' => $finder->count(),
        ]);
    }

    private function broadcastNotification(DomainEvent $event, EventType $type): void
    {
        [$notification, $account, $attention, $count] = $this->extractNotificationAndAccount($event);

        $this->broadcast($account, [$notification->user?->pubsub_token], $type, [
            'notification' => $notification->pushEventData(),
            ...$attention,
            'count' => $count,
        ]);
    }

    public function conversationMentioned(DomainEvent $event): void
    {
        [$conversation, $account] = $this->extractConversationAndAccount($event);
        $user = $event->data['user'];

        $this->broadcast($account, [$user->pubsub_token], EventType::CONVERSATION_MENTIONED, RealtimePayload::conversation($conversation));
    }

    private function broadcastConversationToMembers(DomainEvent $event, EventType $type): void
    {
        [$conversation, $account] = $this->extractConversationAndAccount($event);
        $tokens = $this->userTokens($account, $conversation->inbox->members()->get());

        $this->broadcast($account, $tokens, $type, RealtimePayload::conversation($conversation));
    }

    private function broadcastConversationToMembersAndContact(DomainEvent $event, EventType $type): void
    {
        [$conversation, $account] = $this->extractConversationAndAccount($event);
        $tokens = [
            ...$this->userTokens($account, $conversation->inbox->members()->get()),
            ...$this->contactInboxTokens($conversation->contactInbox),
        ];

        $this->broadcast($account, $tokens, $type, RealtimePayload::conversation($conversation));
    }

    private function broadcastContactToAccount(DomainEvent $event, EventType $type): void
    {
        [$contact, $account] = $this->extractContactAndAccount($event);

        $this->broadcast($account, [$this->accountToken($account)], $type, ContactResource::pushEventData($contact));
    }

    private function broadcastTyping(DomainEvent $event, EventType $type): void
    {
        $conversation = $event->data['conversation'];
        $account = $conversation->account;
        $user = $event->data['user'];

        $this->broadcast($account, $this->typingEventListenerTokens($account, $conversation, $user), $type, [
            'conversation' => RealtimePayload::typingConversation($conversation),
            'user' => match (true) {
                $user instanceof User => UserResource::pushEventData($user, $account),
                $user instanceof AgentBot => $user->pushEventData($conversation->inbox),
                default => RealtimePayload::typingContact(ContactResource::pushEventData($user), $event->data['group_member'] ?? null),
            },
            'is_private' => $event->data['is_private'] ?? false,
        ]);
    }

    private function accountToken(Account $account): string
    {
        return "account_{$account->id}";
    }

    /** @return list<string> */
    private function typingEventListenerTokens(Account $account, Conversation $conversation, User|Contact|AgentBot $user): array
    {
        $contactInboxToken = $conversation->contactInbox?->pubsub_token;
        // Bản gốc: respond_to?(:pubsub_token) — agent bot không có token riêng.
        $currentUserToken = match (true) {
            $user instanceof Contact => $contactInboxToken,
            $user instanceof User => $user->pubsub_token,
            default => null,
        };

        $tokens = [...$this->userTokens($account, $conversation->inbox->members()->get()), $contactInboxToken];

        return array_values(array_filter($tokens, fn (?string $token) => $token !== null && $token !== $currentUserToken));
    }

    /** @param iterable<User> $agents @return list<string> */
    private function userTokens(Account $account, iterable $agents): array
    {
        $agentTokens = collect($agents)->pluck('pubsub_token');
        $adminTokens = $account->users()->wherePivot('role', AccountUser::ROLE_ADMINISTRATOR)->pluck('users.pubsub_token');

        return $agentTokens->merge($adminTokens)->filter()->unique()->values()->all();
    }

    /** @return list<string> */
    private function contactTokens(?ContactInbox $contactInbox, Message $message): array
    {
        if ($message->private || $message->message_type === Message::TYPE_ACTIVITY || $contactInbox === null) {
            return [];
        }

        return $this->contactInboxTokens($contactInbox);
    }

    /** @return list<string> */
    private function contactInboxTokens(?ContactInbox $contactInbox): array
    {
        if ($contactInbox === null) {
            return [];
        }

        if (! $contactInbox->hmac_verified) {
            return [$contactInbox->pubsub_token];
        }

        return $contactInbox->contact->contactInboxes()
            ->where('hmac_verified', true)
            ->pluck('pubsub_token')
            ->filter()
            ->values()
            ->all();
    }

    /** @param list<string> $tokens */
    private function broadcast(Account $account, array $tokens, EventType $type, array $data): void
    {
        $tokens = array_values(array_unique(array_filter($tokens)));

        if ($tokens === []) {
            return;
        }

        $payload = [...$data, 'account_id' => $account->id];

        // performer = người thực hiện (Current.user) — FE cần cho notification
        // kiểu "X đã giao hội thoại cho bạn".
        $performer = auth()->user();
        if ($performer instanceof User) {
            $payload['performer'] = UserResource::pushEventData($performer, $account);
        }

        ActionCableBroadcastJob::dispatch($tokens, $type->value, $payload);
    }
}

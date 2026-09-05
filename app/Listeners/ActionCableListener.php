<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Http\Resources\ContactResource;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Http\Resources\UserResource;
use App\Jobs\ActionCableBroadcastJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Str;

// Port từ refs/chatwoot/app/listeners/action_cable_listener.rb — gom token
// người nghe rồi đẩy ActionCableBroadcastJob (queue critical). Chạy đồng bộ
// trong request như SyncDispatcher. Laravel tự đăng ký qua event discovery
// (handle(DomainEvent)) — KHÔNG Event::listen thêm, kẻo mỗi event bắn 2 lần.
// notification_created/updated/deleted chờ model Notification (D2).
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

    public function conversationMentioned(DomainEvent $event): void
    {
        [$conversation, $account] = $this->extractConversationAndAccount($event);
        $user = $event->data['user'];

        $this->broadcast($account, [$user->pubsub_token], EventType::CONVERSATION_MENTIONED, ConversationResource::pushEventData($conversation));
    }

    private function broadcastConversationToMembers(DomainEvent $event, EventType $type): void
    {
        [$conversation, $account] = $this->extractConversationAndAccount($event);
        $tokens = $this->userTokens($account, $conversation->inbox->members()->get());

        $this->broadcast($account, $tokens, $type, ConversationResource::pushEventData($conversation));
    }

    private function broadcastConversationToMembersAndContact(DomainEvent $event, EventType $type): void
    {
        [$conversation, $account] = $this->extractConversationAndAccount($event);
        $tokens = [
            ...$this->userTokens($account, $conversation->inbox->members()->get()),
            ...$this->contactInboxTokens($conversation->contactInbox),
        ];

        $this->broadcast($account, $tokens, $type, ConversationResource::pushEventData($conversation));
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
            'conversation' => ConversationResource::pushEventData($conversation),
            'user' => $user instanceof User
                ? UserResource::pushEventData($user, $account)
                : ContactResource::pushEventData($user),
            'is_private' => $event->data['is_private'] ?? false,
        ]);
    }

    private function accountToken(Account $account): string
    {
        return "account_{$account->id}";
    }

    /** @return list<string> */
    private function typingEventListenerTokens(Account $account, Conversation $conversation, User|Contact $user): array
    {
        $contactInboxToken = $conversation->contactInbox?->pubsub_token;
        $currentUserToken = $user instanceof Contact ? $contactInboxToken : $user->pubsub_token;

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

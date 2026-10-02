<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Finders\NotificationFinder;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\Notification;
use App\Services\Conversations\UnreadCounts\AttentionCounter;

abstract class BaseListener
{
    /** @return array{0: Conversation, 1: Account} */
    protected function extractConversationAndAccount(DomainEvent $event): array
    {
        $conversation = $event->data['conversation'];

        return [$conversation, $conversation->account];
    }

    /** @return array{0: Notification, 1: Account, 2: int, 3: int} */
    protected function extractNotificationAndAccount(DomainEvent $event): array
    {
        /** @var Notification $notification */
        $notification = $event->data['notification'];
        $finder = new NotificationFinder($notification->user, $notification->account);

        $unreadCount = (new AttentionCounter($notification->account, $notification->user))->count();

        return [$notification, $notification->account, $unreadCount, $finder->count()];
    }

    /** @return array{0: Message, 1: Account} */
    protected function extractMessageAndAccount(DomainEvent $event): array
    {
        $message = $event->data['message'];

        return [$message, $message->account];
    }

    /** @return array{0: Contact, 1: Account} */
    protected function extractContactAndAccount(DomainEvent $event): array
    {
        $contact = $event->data['contact'];

        return [$contact, $contact->account];
    }

    /** @return array{0: Inbox, 1: Account} */
    protected function extractInboxAndAccount(DomainEvent $event): array
    {
        $inbox = $event->data['inbox'];

        return [$inbox, $inbox->account];
    }

    /** @return list<array<string, array{previous_value: mixed, current_value: mixed}>>|null */
    protected function extractChangedAttributes(DomainEvent $event): ?array
    {
        $changedAttributes = $event->data['changed_attributes'] ?? null;

        if (blank($changedAttributes)) {
            return null;
        }

        return collect($changedAttributes)
            ->map(fn (array $values, string $attribute) => [
                $attribute => ['previous_value' => $values[0], 'current_value' => $values[1]],
            ])
            ->values()
            ->all();
    }
}

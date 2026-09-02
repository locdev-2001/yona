<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;

// Port từ refs/chatwoot/app/listeners/base_listener.rb.
// extract_notification_and_account chờ model Notification (D2).
abstract class BaseListener
{
    /** @return array{0: Conversation, 1: Account} */
    protected function extractConversationAndAccount(DomainEvent $event): array
    {
        $conversation = $event->data['conversation'];

        return [$conversation, $conversation->account];
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

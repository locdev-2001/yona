<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Jobs\Integrations\HookJob;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Integrations\Hook;
use App\Models\Message;
use App\Support\Integrations\EventProcessorResolver;

// Chuyển sự kiện tới các
// hook tích hợp đang bật. Danh sách sự kiện app nhận đọc từ driver của app
// (EventProcessor::supportedEvents), không phải bảng hardcode như bản gốc.
class HookListener extends BaseListener
{
    public function handle(DomainEvent $event): void
    {
        match ($event->type) {
            EventType::MESSAGE_CREATED, EventType::MESSAGE_UPDATED => $this->messageEvent($event),
            EventType::CONTACT_CREATED, EventType::CONTACT_UPDATED => $this->contactEvent($event),
            EventType::CONVERSATION_CREATED => $this->conversationEvent($event),
            EventType::CONVERSATION_RESOLVED => $this->conversationResolved($event),
            default => null,
        };
    }

    private function messageEvent(DomainEvent $event): void
    {
        /** @var Message $message */
        [$message] = $this->extractMessageAndAccount($event);

        $message->account->hooks()->with('inbox')->get()
            // Dialogflow có một hook cho mỗi inbox: bỏ hook của inbox khác để
            // không chạy cùng một sự kiện nhiều lần.
            ->reject(fn (Hook $hook) => $hook->inbox_id !== null && $hook->inbox_id !== $message->inbox_id)
            ->each(fn (Hook $hook) => $this->dispatchHook($hook, $event, [
                'message' => $message,
                'previous_changes' => $event->data['previous_changes'] ?? null,
            ]));
    }

    private function contactEvent(DomainEvent $event): void
    {
        /** @var Contact $contact */
        [$contact, $account] = $this->extractContactAndAccount($event);

        $this->dispatchAccountHooks($event, $account, ['contact' => $contact]);
    }

    private function conversationEvent(DomainEvent $event): void
    {
        /** @var Conversation $conversation */
        [$conversation, $account] = $this->extractConversationAndAccount($event);

        $this->dispatchAccountHooks($event, $account, ['conversation' => $conversation]);
    }

    private function conversationResolved(DomainEvent $event): void
    {
        /** @var Conversation $conversation */
        [$conversation, $account] = $this->extractConversationAndAccount($event);

        if ($conversation->status !== Conversation::STATUS_RESOLVED) {
            return;
        }

        $this->dispatchAccountHooks($event, $account, ['conversation' => $conversation]);
    }

    private function dispatchAccountHooks(DomainEvent $event, Account $account, array $eventData): void
    {
        $account->hooks()->accountHooks()->get()
            ->each(fn (Hook $hook) => $this->dispatchHook($hook, $event, $eventData));
    }

    private function dispatchHook(Hook $hook, DomainEvent $event, array $eventData): void
    {
        if (! $this->supportsEvent($hook, $event->type->value)) {
            return;
        }

        HookJob::dispatch($hook, $event->type->value, $eventData);
    }

    private function supportsEvent(Hook $hook, string $eventName): bool
    {
        if ($hook->isDisabled()) {
            return false;
        }

        $processor = EventProcessorResolver::forHook($hook);

        return $processor !== null && in_array($eventName, $processor->supportedEvents(), true);
    }
}

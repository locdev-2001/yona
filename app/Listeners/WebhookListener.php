<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Http\Resources\ContactResource;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\InboxResource;
use App\Http\Resources\MessageResource;
use App\Http\Resources\UserResource;
use App\Jobs\WebhookJob;
use App\Models\Account;
use App\Models\AgentBot;
use App\Models\Channel\Api;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Models\Webhook;
use App\Services\Webhooks\Trigger;
use Closure;
use Illuminate\Support\Str;

// Bắn payload ra
// webhook của account (và webhook của kênh API) theo danh sách sự kiện đã đăng ký.
class WebhookListener extends BaseListener
{
    public function handle(DomainEvent $event): void
    {
        match ($event->type) {
            EventType::CONVERSATION_STATUS_CHANGED => $this->conversationEvent($event, 'conversation_status_changed', true),
            EventType::CONVERSATION_UPDATED => $this->conversationEvent($event, 'conversation_updated', true),
            EventType::CONVERSATION_CREATED => $this->conversationEvent($event, 'conversation_created', false),
            EventType::MESSAGE_CREATED => $this->messageEvent($event, 'message_created'),
            EventType::MESSAGE_UPDATED => $this->messageEvent($event, 'message_updated'),
            EventType::WEBWIDGET_TRIGGERED => $this->webwidgetTriggered($event),
            EventType::CONTACT_CREATED => $this->contactCreated($event),
            EventType::CONTACT_UPDATED => $this->contactUpdated($event),
            EventType::INBOX_CREATED => $this->inboxEvent($event, 'inbox_created', false),
            EventType::INBOX_UPDATED => $this->inboxEvent($event, 'inbox_updated', true),
            EventType::CONVERSATION_TYPING_ON => $this->typingStatus($event, 'conversation_typing_on'),
            EventType::CONVERSATION_TYPING_OFF => $this->typingStatus($event, 'conversation_typing_off'),
            default => null,
        };
    }

    private function conversationEvent(DomainEvent $event, string $eventName, bool $withChangedAttributes): void
    {
        /** @var Conversation $conversation */
        [$conversation] = $this->extractConversationAndAccount($event);

        $this->deliverWebhookPayloads($eventName, fn () => [
            ...ConversationResource::webhookData($conversation),
            'event' => $eventName,
            ...($withChangedAttributes ? ['changed_attributes' => $this->extractChangedAttributes($event)] : []),
        ], $conversation->inbox);
    }

    private function messageEvent(DomainEvent $event, string $eventName): void
    {
        /** @var Message $message */
        [$message] = $this->extractMessageAndAccount($event);

        if (! $message->isWebhookSendable()) {
            return;
        }

        $this->deliverWebhookPayloads(
            $eventName,
            fn () => [...MessageResource::webhookData($message), 'event' => $eventName],
            $message->inbox,
        );
    }

    private function webwidgetTriggered(DomainEvent $event): void
    {
        /** @var ContactInbox $contactInbox */
        $contactInbox = $event->data['contact_inbox'];

        $this->deliverWebhookPayloads('webwidget_triggered', fn () => [
            ...$contactInbox->webhookData(),
            'event' => 'webwidget_triggered',
            'event_info' => $event->data['event_info'] ?? null,
        ], $contactInbox->inbox);
    }

    private function contactCreated(DomainEvent $event): void
    {
        /** @var Contact $contact */
        [$contact, $account] = $this->extractContactAndAccount($event);

        $this->deliverAccountWebhooks(
            'contact_created',
            fn () => [...ContactResource::webhookData($contact), 'event' => 'contact_created'],
            $account,
        );
    }

    private function contactUpdated(DomainEvent $event): void
    {
        /** @var Contact $contact */
        [$contact, $account] = $this->extractContactAndAccount($event);
        $changedAttributes = $this->extractChangedAttributes($event);

        if (blank($changedAttributes)) {
            return;
        }

        $this->deliverAccountWebhooks('contact_updated', fn () => [
            ...ContactResource::webhookData($contact),
            'event' => 'contact_updated',
            'changed_attributes' => $changedAttributes,
        ], $account);
    }

    private function inboxEvent(DomainEvent $event, string $eventName, bool $withChangedAttributes): void
    {
        /** @var Inbox $inbox */
        [$inbox, $account] = $this->extractInboxAndAccount($event);
        $changedAttributes = $this->extractChangedAttributes($event);

        if ($withChangedAttributes && blank($changedAttributes)) {
            return;
        }

        $this->deliverAccountWebhooks($eventName, fn () => [
            ...InboxResource::eventWebhookData($inbox),
            'event' => $eventName,
            ...($withChangedAttributes ? ['changed_attributes' => $changedAttributes] : []),
        ], $account);
    }

    private function typingStatus(DomainEvent $event, string $eventName): void
    {
        /** @var Conversation $conversation */
        $conversation = $event->data['conversation'];
        $user = $event->data['user'] ?? null;

        $this->deliverWebhookPayloads($eventName, fn () => [
            'event' => $eventName,
            'user' => match (true) {
                $user instanceof User => UserResource::webhookData($user),
                $user instanceof AgentBot => $user->webhookData(),
                $user instanceof Contact => ContactResource::webhookData($user),
                default => null,
            },
            'conversation' => ConversationResource::webhookData($conversation),
            'is_private' => $event->data['is_private'] ?? false,
        ], $conversation->inbox);
    }

    /**
     * Payload chỉ được dựng khi có ít nhất một nơi nhận: dựng payload hội thoại/tin
     * tốn vài chục truy vấn, còn phần lớn account không đăng ký webhook nào.
     *
     * @param  Closure(): array<string, mixed>  $buildPayload
     */
    private function deliverWebhookPayloads(string $eventName, Closure $buildPayload, Inbox $inbox): void
    {
        $payload = null;
        $builtOnce = function () use (&$payload, $buildPayload): array {
            return $payload ??= $buildPayload();
        };

        $this->deliverAccountWebhooks($eventName, $builtOnce, $inbox->account);
        $this->deliverApiInboxWebhooks($builtOnce, $inbox);
    }

    /** @param Closure(): array<string, mixed> $buildPayload */
    private function deliverAccountWebhooks(string $eventName, Closure $buildPayload, Account $account): void
    {
        if (! $account->apiAndWebhooksEnabled()) {
            return;
        }

        $account->webhooks()->accountType()->get()
            ->filter(fn (Webhook $webhook) => $webhook->isSubscribedTo($eventName))
            ->each(fn (Webhook $webhook) => WebhookJob::dispatch(
                $webhook->url,
                $buildPayload(),
                Trigger::TYPE_ACCOUNT,
                $webhook->secret,
                (string) Str::uuid(),
            ));
    }

    /** @param Closure(): array<string, mixed> $buildPayload */
    private function deliverApiInboxWebhooks(Closure $buildPayload, Inbox $inbox): void
    {
        $channel = $inbox->channel;

        if (! $channel instanceof Api || blank($channel->webhook_url)) {
            return;
        }

        WebhookJob::dispatch(
            $channel->webhook_url,
            $buildPayload(),
            Trigger::TYPE_API_INBOX,
            $channel->secret,
            (string) Str::uuid(),
        );
    }
}

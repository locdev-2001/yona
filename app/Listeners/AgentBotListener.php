<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Jobs\AgentBots\WebhookJob;
use App\Models\AgentBot;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Webhooks\Trigger;
use Illuminate\Support\Str;

// Đẩy sự kiện tới
// bot đang phụ trách hội thoại (bot được gán) và bot đang bật của inbox.
class AgentBotListener extends BaseListener
{
    public function handle(DomainEvent $event): void
    {
        match ($event->type) {
            EventType::CONVERSATION_RESOLVED => $this->conversationEvent($event, 'conversation_resolved', false),
            EventType::CONVERSATION_OPENED => $this->conversationEvent($event, 'conversation_opened', false),
            EventType::CONVERSATION_STATUS_CHANGED => $this->conversationEvent($event, 'conversation_status_changed', true),
            EventType::CONVERSATION_UPDATED => $this->conversationEvent($event, 'conversation_updated', true),
            EventType::MESSAGE_CREATED => $this->messageEvent($event, 'message_created'),
            EventType::MESSAGE_UPDATED => $this->messageEvent($event, 'message_updated'),
            EventType::WEBWIDGET_TRIGGERED => $this->webwidgetTriggered($event),
            default => null,
        };
    }

    private function conversationEvent(DomainEvent $event, string $eventName, bool $withChangedAttributes): void
    {
        /** @var Conversation $conversation */
        [$conversation] = $this->extractConversationAndAccount($event);

        $payload = [
            ...ConversationResource::webhookData($conversation),
            'event' => $eventName,
            ...($withChangedAttributes ? ['changed_attributes' => $this->extractChangedAttributes($event)] : []),
        ];

        $this->dispatchToBots($conversation->inbox, $payload, $conversation);
    }

    private function messageEvent(DomainEvent $event, string $eventName): void
    {
        /** @var Message $message */
        [$message] = $this->extractMessageAndAccount($event);

        if (! $message->isWebhookSendable()) {
            return;
        }

        $this->dispatchToBots(
            $message->inbox,
            [...MessageResource::webhookData($message), 'event' => $eventName],
            $message->conversation,
        );
    }

    private function webwidgetTriggered(DomainEvent $event): void
    {
        /** @var ContactInbox $contactInbox */
        $contactInbox = $event->data['contact_inbox'];

        $this->dispatchToBots($contactInbox->inbox, [
            ...$contactInbox->webhookData(),
            'event' => 'webwidget_triggered',
            'event_info' => $event->data['event_info'] ?? null,
        ]);
    }

    /** @return list<AgentBot> */
    private function agentBotsFor(Inbox $inbox, ?Conversation $conversation = null): array
    {
        $bots = [];

        if ($conversation?->assigneeAgentBot !== null) {
            $bots[] = $conversation->assigneeAgentBot;
        }

        $agentBotInbox = $inbox->agentBotInbox;
        if ($agentBotInbox !== null && $agentBotInbox->isActive() && $agentBotInbox->agentBot !== null) {
            $bots[] = $agentBotInbox->agentBot;
        }

        return collect($bots)->unique('id')->values()->all();
    }

    private function dispatchToBots(Inbox $inbox, array $payload, ?Conversation $conversation = null): void
    {
        foreach ($this->agentBotsFor($inbox, $conversation) as $agentBot) {
            if (blank($agentBot->outgoing_url)) {
                continue;
            }

            WebhookJob::dispatch(
                $agentBot->outgoing_url,
                $payload,
                Trigger::TYPE_AGENT_BOT,
                $agentBot->secret,
                (string) Str::uuid(),
            );
        }
    }
}

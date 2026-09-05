<?php

namespace App\Services\Conversations;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\Conversation;
use App\Models\User;
use App\Support\BooleanParam;

// Port từ refs/chatwoot/app/services/conversations/typing_status_manager.rb.
class TypingStatusManager
{
    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Conversation $conversation,
        private readonly User $user,
        private readonly array $params,
    ) {}

    public function toggleTypingStatus(): void
    {
        match ($this->params['typing_status'] ?? null) {
            'on' => $this->triggerTypingEvent(EventType::CONVERSATION_TYPING_ON),
            'off' => $this->triggerTypingEvent(EventType::CONVERSATION_TYPING_OFF),
            default => null,
        };
    }

    private function triggerTypingEvent(EventType $event): void
    {
        DomainEvent::dispatch($event, [
            'conversation' => $this->conversation,
            'user' => $this->user,
            'is_private' => $this->isPrivate(),
        ]);
    }

    // Ruby nhận params[:is_private] thô (nil/true/"true"); JSON FE gửi boolean.
    private function isPrivate(): bool
    {
        return BooleanParam::from($this->params['is_private'] ?? null);
    }
}

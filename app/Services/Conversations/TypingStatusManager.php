<?php

namespace App\Services\Conversations;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\AgentBot;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\User;
use App\Support\BooleanParam;

class TypingStatusManager
{
    /**
     * @param  array<string, mixed>  $params
     * @param  array{external_id: string, name: string, avatar?: string|null}|null  $groupMember
     */
    public function __construct(
        private readonly Conversation $conversation,
        // Widget bắn sự kiện gõ với sender là Contact (khách), dashboard là User,
        // Application API là AgentBot.
        private readonly User|Contact|AgentBot $user,
        private readonly array $params,
        // Hội thoại nhóm: liên hệ của hội thoại là cả nhóm, người gõ thật là một
        // thành viên — cùng hình dạng `content_attributes.sender` của tin nhóm.
        private readonly ?array $groupMember = null,
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
            'group_member' => $this->groupMember,
        ]);
    }

    // Ruby nhận params[:is_private] thô (nil/true/"true"); JSON FE gửi boolean.
    private function isPrivate(): bool
    {
        return BooleanParam::from($this->params['is_private'] ?? null);
    }
}

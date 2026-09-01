<?php

namespace App\Builders;

use App\Models\ContactInbox;
use App\Models\Conversation;

// Port từ refs/chatwoot/app/builders/conversation_builder.rb.
class ConversationBuilder
{
    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly array $params,
        private readonly ContactInbox $contactInbox,
    ) {}

    public function perform(): Conversation
    {
        return $this->lookUpExistingConversation() ?? $this->createNewConversation();
    }

    private function lookUpExistingConversation(): ?Conversation
    {
        if (! $this->contactInbox->inbox->lock_to_single_conversation) {
            return null;
        }

        return $this->contactInbox->conversations()->latest('id')->first();
    }

    private function createNewConversation(): Conversation
    {
        return Conversation::query()->create($this->conversationParams());
    }

    /** @return array<string, mixed> */
    private function conversationParams(): array
    {
        $attributes = [
            'account_id' => $this->contactInbox->inbox->account_id,
            'inbox_id' => $this->contactInbox->inbox_id,
            'contact_id' => $this->contactInbox->contact_id,
            'contact_inbox_id' => $this->contactInbox->id,
            'additional_attributes' => $this->params['additional_attributes'] ?? [],
            'custom_attributes' => $this->params['custom_attributes'] ?? [],
            'snoozed_until' => $this->params['snoozed_until'] ?? null,
            'assignee_id' => $this->params['assignee_id'] ?? null,
            'team_id' => $this->params['team_id'] ?? null,
        ];

        if (filled($this->params['status'] ?? null)) {
            $attributes['status'] = Conversation::statusFromName($this->params['status']);
        }

        return $attributes;
    }
}

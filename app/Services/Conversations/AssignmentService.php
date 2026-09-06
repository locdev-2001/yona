<?php

namespace App\Services\Conversations;

use App\Models\AgentBot;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

// Port từ refs/chatwoot/app/services/conversations/assignment_service.rb.
final class AssignmentService
{
    public function __construct(
        private readonly Conversation $conversation,
        private readonly int|string|null $assigneeId,
        private readonly ?string $assigneeType = null,
    ) {}

    public function perform(): User|AgentBot|null
    {
        return $this->assigneeType === 'AgentBot' ? $this->assignAgentBot() : $this->assignAgent();
    }

    private function assignAgent(): ?User
    {
        $assignee = $this->assignee();

        DB::transaction(function () use ($assignee) {
            $this->conversation->newModelQuery()->whereKey($this->conversation->id)->lockForUpdate()->get();

            // Agent nhận việc từ tay bot thì hội thoại mở lại và bắt đầu tính chờ.
            if ($assignee !== null
                && $this->conversation->assignee_agent_bot_id !== null
                && $this->conversation->status === Conversation::STATUS_PENDING) {
                $this->conversation->status = Conversation::STATUS_OPEN;
                $this->conversation->waiting_since ??= now();
            }

            $this->conversation->assignee_id = $assignee?->id;
            $this->conversation->assignee_agent_bot_id = null;
            $this->conversation->save();
        });

        return $assignee;
    }

    private function assignAgentBot(): ?AgentBot
    {
        $agentBot = $this->agentBot();

        if ($agentBot === null) {
            return null;
        }

        DB::transaction(function () use ($agentBot) {
            $this->conversation->newModelQuery()->whereKey($this->conversation->id)->lockForUpdate()->get();
            $this->conversation->assignee_id = null;
            $this->conversation->assignee_agent_bot_id = $agentBot->id;
            $this->conversation->status = Conversation::STATUS_PENDING;
            $this->conversation->save();
        });

        return $agentBot;
    }

    private function assignee(): ?User
    {
        if (blank($this->assigneeId)) {
            return null;
        }

        return $this->conversation->account->users()->where('users.id', (int) $this->assigneeId)->first();
    }

    private function agentBot(): ?AgentBot
    {
        if (blank($this->assigneeId)) {
            return null;
        }

        return AgentBot::query()
            ->accessibleTo($this->conversation->account)
            ->whereKey((int) $this->assigneeId)
            ->first();
    }
}

<?php

namespace App\Services\Conversations;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

// Port từ refs/chatwoot/app/services/conversations/assignment_service.rb.
// Bỏ nhánh AgentBot (assign_agent_bot + mở lại hội thoại pending) — AgentBot
// chưa port.
final class AssignmentService
{
    public function __construct(
        private readonly Conversation $conversation,
        private readonly int|string|null $assigneeId,
    ) {}

    public function perform(): ?User
    {
        $assignee = $this->assignee();

        DB::transaction(function () use ($assignee) {
            $this->conversation->newModelQuery()->whereKey($this->conversation->id)->lockForUpdate()->get();
            $this->conversation->assignee_id = $assignee?->id;
            $this->conversation->save();
        });

        return $assignee;
    }

    private function assignee(): ?User
    {
        if (blank($this->assigneeId)) {
            return null;
        }

        return $this->conversation->account->users()->where('users.id', (int) $this->assigneeId)->first();
    }
}

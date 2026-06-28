<?php

namespace Modules\Inbox\Policies;

use Modules\Identity\Models\User;
use Modules\Inbox\Models\Conversation;

/**
 * P07 — Authorization cho Conversation inbox.
 *
 * Quy tắc: user phải là member active của workspace chứa conversation.
 * RLS đã enforce workspace boundary ở DB level — policy chỉ cần kiểm membership.
 */
class ConversationPolicy
{
    public function viewAny(User $user): bool
    {
        return currentWorkspace() !== null;
    }

    public function view(User $user, Conversation $conversation): bool
    {
        return $conversation->workspace_id === currentWorkspace()?->id;
    }

    public function update(User $user, Conversation $conversation): bool
    {
        return $conversation->workspace_id === currentWorkspace()?->id;
    }
}

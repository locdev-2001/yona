<?php

namespace App\Services\Notification;

use App\Models\Account;
use App\Models\Conversation;
use App\Models\Notification;
use App\Models\User;

// Port từ refs/chatwoot/app/services/notification/mark_conversation_read_service.rb —
// mở hội thoại là dọn luôn thông báo chưa đọc của chính hội thoại đó.
class MarkConversationReadService
{
    public function __construct(
        private readonly ?User $user,
        private readonly Account $account,
        private readonly Conversation $conversation,
    ) {}

    public function perform(): void
    {
        if ($this->user === null) {
            return;
        }

        Notification::query()
            ->where('user_id', $this->user->id)
            ->where('account_id', $this->account->id)
            ->where('primary_actor_type', $this->conversation->getMorphClass())
            ->where('primary_actor_id', $this->conversation->id)
            ->unread()
            ->get()
            ->each(fn (Notification $notification) => $notification->update(['read_at' => now()]));
    }
}

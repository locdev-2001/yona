<?php

namespace App\Services\Notification;

use App\Models\Notification;
use App\Notifications\ConversationNotification;
use App\Support\OnlineStatusTracker;

// + phần điều kiện của AgentNotifications::ConversationNotificationsMailer.
class EmailNotificationService
{
    // Hai loại "có tin mới" không gửi email khi agent đang online (khỏi spam).
    private const SKIP_WHEN_ONLINE = [
        'assigned_conversation_new_message',
        'participating_conversation_new_message',
    ];

    public function __construct(private readonly Notification $notification) {}

    public function perform(): void
    {
        if (! $this->shouldSend()) {
            return;
        }

        $this->notification->user->notify(new ConversationNotification($this->notification));
    }

    private function shouldSend(): bool
    {
        if ($this->notification->read_at !== null) {
            return false;
        }

        $user = $this->notification->user;

        if ($user === null || ! $user->isConfirmed()) {
            return false;
        }

        if (! $this->notification->userSubscribedTo('email')) {
            return false;
        }

        if ($this->notification->conversation() === null) {
            return false;
        }

        return ! $this->agentOnlineForNewMessage();
    }

    private function agentOnlineForNewMessage(): bool
    {
        if (! in_array($this->notification->typeName(), self::SKIP_WHEN_ONLINE, true)) {
            return false;
        }

        return OnlineStatusTracker::getPresence(
            $this->notification->account_id,
            'User',
            $this->notification->user_id,
        );
    }
}

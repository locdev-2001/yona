<?php

namespace App\Services\Messages;

use App\Builders\NotificationBuilder;
use App\Models\ConversationParticipant;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;

class NewMessageNotificationService
{
    public function __construct(private readonly Message $message) {}

    public function perform(): void
    {
        if (! $this->isNotifiable()) {
            return;
        }

        $this->notifyConversationAssignee();
        $this->notifyParticipatingUsers();
    }

    // MessageFilterHelpers#notifiable?: tin của khách hoặc của agent, không phải ghi chú riêng.
    private function isNotifiable(): bool
    {
        return ($this->message->isIncoming() || $this->message->isOutgoing()) && ! $this->message->private;
    }

    private function notifyConversationAssignee(): void
    {
        $assignee = $this->message->conversation->assignee;

        if ($assignee === null || $this->alreadyNotified($assignee) || $this->isSender($assignee)) {
            return;
        }

        $this->build('assigned_conversation_new_message', $assignee);
    }

    private function notifyParticipatingUsers(): void
    {
        $sender = $this->message->sender;

        $this->message->conversation->conversationParticipants()
            ->with('user')
            ->get()
            ->map(fn (ConversationParticipant $participant) => $participant->user)
            ->filter()
            ->reject(fn (User $user) => $sender instanceof User && $sender->id === $user->id)
            ->unique('id')
            ->each(function (User $participant) {
                if ($this->alreadyNotified($participant)) {
                    return;
                }

                $this->build('participating_conversation_new_message', $participant);
            });
    }

    // Đã được báo qua nhắc tên hoặc gán việc thì không báo lần hai cho cùng tin nhắn.
    private function alreadyNotified(User $user): bool
    {
        return $this->message->conversation->notifications()
            ->where('user_id', $user->id)
            ->where('secondary_actor_type', $this->message->getMorphClass())
            ->where('secondary_actor_id', $this->message->id)
            ->exists();
    }

    private function isSender(User $user): bool
    {
        $sender = $this->message->sender;

        return $sender instanceof User && $sender->id === $user->id;
    }

    private function build(string $notificationType, User $user): ?Notification
    {
        return (new NotificationBuilder(
            $notificationType,
            $user,
            $this->message->account,
            $this->message->conversation,
            $this->message,
        ))->perform();
    }
}

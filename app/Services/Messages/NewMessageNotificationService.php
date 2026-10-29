<?php

namespace App\Services\Messages;

use App\Builders\NotificationBuilder;
use App\Models\Conversation;
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

        $this->notifyInboxOwner();
        $this->notifyParticipatingUsers();
    }

    // MessageFilterHelpers#notifiable?: tin của khách hoặc của agent, không phải ghi chú riêng.
    private function isNotifiable(): bool
    {
        return ($this->message->isIncoming() || $this->message->isOutgoing()) && ! $this->message->private;
    }

    // Tin đi do chính chủ hộp thư gửi (kể cả gửi từ điện thoại) nên chỉ tin đến mới báo.
    private function notifyInboxOwner(): void
    {
        $owner = $this->message->account->owner();

        if ($owner === null || ! $this->message->isIncoming() || $this->alreadyNotified($owner)) {
            return;
        }

        $this->build($this->opensConversation() ? 'conversation_assignment' : 'assigned_conversation_new_message', $owner);
    }

    // Tin đến đầu tiên báo "Hội thoại mới" kèm nội dung tin; hội thoại ở mục Yêu cầu chỉ báo tin đến.
    private function opensConversation(): bool
    {
        $conversation = $this->message->conversation;

        return $conversation->status !== Conversation::STATUS_PENDING
            && ! $conversation->messages()->incoming()->where('id', '<', $this->message->id)->exists();
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

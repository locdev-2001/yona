<?php

namespace App\Notifications;

use App\Models\Message;
use App\Models\Notification as NotificationRecord;
use App\Models\User;
use App\Support\PlainTextContent;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

// Port từ AgentNotifications::ConversationNotificationsMailer — một lớp cho cả
// 5 loại thông báo hội thoại, tiêu đề lấy từ lang/en/notifications.php.
class ConversationNotification extends Notification
{
    use Queueable;

    private const RECENT_MESSAGES_LIMIT = 5;

    public function __construct(private readonly NotificationRecord $notification) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $conversation = $this->notification->conversation();
        $accountId = $this->notification->account_id;
        $actionUrl = url("/app/accounts/$accountId/conversations/{$conversation->display_id}");

        return (new MailMessage)
            ->subject(__('notifications.email.'.$this->notification->typeName(), [
                'agent_name' => $notifiable->availableName(),
                'display_id' => $conversation->display_id,
                'inbox_name' => $conversation->inbox->name,
            ]))
            ->view('mail.conversation-notification', [
                'agentName' => $notifiable->availableName(),
                'notificationType' => $this->notification->typeName(),
                'conversation' => $conversation,
                'mentionedText' => $this->mentionedText(),
                'mentionedBy' => $this->mentionedBy(),
                'recentMessages' => $this->recentMessages(),
                'actionUrl' => $actionUrl,
                'notificationSettingsUrl' => url("/app/accounts/$accountId/profile/settings"),
            ]);
    }

    private function mentionedText(): string
    {
        $secondaryActor = $this->notification->secondaryActor;

        return $secondaryActor instanceof Message
            ? PlainTextContent::fromMarkdown($secondaryActor->content)
            : '';
    }

    private function mentionedBy(): string
    {
        $secondaryActor = $this->notification->secondaryActor;

        return $secondaryActor instanceof Message ? ($secondaryActor->sender?->name ?? '') : '';
    }

    /** @return list<array{sender: string, content: string, attachments: list<string>}> */
    private function recentMessages(): array
    {
        $conversation = $this->notification->conversation();
        $contactName = $conversation->contact?->name ?? 'Customer';

        return $conversation->messages()
            ->chat()
            ->reorder('created_at', 'desc')
            ->limit(self::RECENT_MESSAGES_LIMIT)
            ->get()
            ->reverse()
            ->map(fn (Message $message) => [
                'sender' => $message->sender === null
                    ? 'Bot'
                    : ($message->sender instanceof User ? $message->sender->availableName() : $contactName),
                'content' => PlainTextContent::fromMarkdown($message->content),
                'attachments' => $message->attachments->map(fn ($attachment) => $attachment->fileUrl())->filter()->values()->all(),
            ])
            ->values()
            ->all();
    }
}

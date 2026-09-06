<?php

namespace App\Notifications;

use App\Mail\ConversationReplyMail;
use App\Models\Conversation;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Port từ refs/chatwoot/app/mailers/team_notifications/automation_notification_mailer.rb
 * (+ view conversation_creation.liquid): thư báo cho cả một team khi rule chạy
 * hành động `send_email_to_team`. Tiêu đề là chuỗi cứng của bản gốc, không đi
 * qua i18n.
 */
class TeamAutomationNotification extends Notification
{
    use Queueable;

    private const SUBJECT = 'This email has been sent via automation rule actions.';

    public function __construct(
        private readonly Conversation $conversation,
        private readonly string $customMessage,
    ) {}

    public static function deliverable(): bool
    {
        return ConversationReplyMail::smtpConfigSetOrDevelopment();
    }

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $accountId = $this->conversation->account_id;

        return (new MailMessage)
            ->subject(self::SUBJECT)
            ->view('mail.team-automation-notification', [
                'customMessage' => $this->customMessage,
                'actionUrl' => url("/app/accounts/{$accountId}/conversations/{$this->conversation->display_id}"),
            ]);
    }
}

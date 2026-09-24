<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

// Tương đương Devise reset_password_instructions
// (template mail đầy đủ port ở D5 — email templates).
class ResetPasswordInstructions extends Notification
{
    use Queueable;

    public function __construct(private readonly string $token) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $resetUrl = url('/app/auth/password/edit?reset_password_token='.$this->token);

        return (new MailMessage)
            ->subject(__('Reset password instructions'))
            ->line(__('Someone has requested a link to change your password. You can do this through the link below.'))
            ->action(__('Change my password'), $resetUrl)
            ->line(__("If you didn't request this, please ignore this email. Your password won't change until you access the link above and create a new one."));
    }
}

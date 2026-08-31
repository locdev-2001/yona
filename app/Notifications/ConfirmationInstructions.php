<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

// Tương đương Devise confirmation_instructions của Chatwoot (template mail
// đầy đủ port ở D5 — email templates).
class ConfirmationInstructions extends Notification
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $confirmationUrl = url('/app/auth/confirmation?confirmation_token='.$notifiable->confirmation_token);

        return (new MailMessage)
            ->subject(__('Confirmation Instructions'))
            ->line(__('Welcome to :app!', ['app' => config('app.name')]))
            ->line(__('You can confirm your account email through the link below:'))
            ->action(__('Confirm my account'), $confirmationUrl);
    }
}

<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

// Tương đương Devise confirmation_instructions của Chatwoot (template mail
// đầy đủ port ở D5 — email templates). Giữ 4 nhánh nội dung như ERB gốc:
// đổi email / đã xác nhận / được mời vào workspace / đăng ký mới.
class ConfirmationInstructions extends Notification
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $brandName = config('app.name');
        $confirmationUrl = url('/app/auth/confirmation?confirmation_token='.$notifiable->confirmation_token);

        if ($notifiable->unconfirmed_email) {
            return (new MailMessage)
                ->subject(__('Confirm your new email address'))
                ->line(__('We received a request to update the email address on your :app account.', ['app' => $brandName]))
                ->line(__('Confirm the new address below to finish the change.'))
                ->action(__('Confirm email address'), $confirmationUrl);
        }

        if ($notifiable->isConfirmed()) {
            return (new MailMessage)
                ->subject(__('Your account is ready'))
                ->line(__('Your :app account is already active.', ['app' => $brandName]))
                ->line(__('Use the button below to sign in and continue where you left off.'))
                ->action(__('Open my account'), url('/app/login'));
        }

        $membership = $notifiable->accountUsers()->with(['inviter', 'account'])->first();
        if ($membership?->inviter) {
            // Người được mời xác nhận bằng chính bước đặt mật khẩu (link reset token).
            $passwordUrl = url('/app/auth/password/edit?reset_password_token='.$notifiable->generateResetPasswordToken());

            return (new MailMessage)
                ->subject(__("You're invited to join :account", ['account' => $membership->account->name]))
                ->line(__(':inviter invited you to join the :account workspace on :app.', [
                    'inviter' => $membership->inviter->name,
                    'account' => $membership->account->name,
                    'app' => $brandName,
                ]))
                ->line(__('Create your account to start collaborating with your team.'))
                ->action(__('Accept invitation'), $passwordUrl);
        }

        return (new MailMessage)
            ->subject(__('Confirmation Instructions'))
            ->line(__('Welcome to :app!', ['app' => $brandName]))
            ->line(__('You can confirm your account email through the link below:'))
            ->action(__('Confirm my account'), $confirmationUrl);
    }
}

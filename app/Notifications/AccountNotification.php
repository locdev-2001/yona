<?php

namespace App\Notifications;

use App\Models\Account;
use App\Models\AccountUser;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Port từ AdministratorNotifications::AccountNotificationMailer (+ BaseMailer):
 * một lớp cho mọi thư báo cấp tài khoản, thân thư là blade
 * `mail.account-notification.<template>`, biến dùng chung là action_url + meta.
 */
class AccountNotification extends Notification
{
    use Queueable;

    /** @param array<string, mixed> $meta */
    public function __construct(
        private readonly string $template,
        private readonly string $subject,
        private readonly ?string $actionUrl = null,
        private readonly array $meta = [],
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->subject)
            ->view('mail.account-notification.'.$this->template, [
                'actionUrl' => $this->actionUrl,
                'meta' => $this->meta,
            ]);
    }

    /** @return list<string> */
    public static function administratorEmails(Account $account): array
    {
        return $account->users()
            ->wherePivot('role', AccountUser::ROLE_ADMINISTRATOR)
            ->pluck('email')
            ->all();
    }
}

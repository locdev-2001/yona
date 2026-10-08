<?php

namespace App\Notifications;

use App\Models\Account;
use App\Models\AccountUser;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Một lớp cho mọi thư báo cấp tài khoản: thân thư là blade
 * `mail.account-notification.<template>`, tiêu đề là `notifications.account.<template>.subject`,
 * cả hai dịch theo ngôn ngữ của tài khoản (job chạy hàng đợi không có locale của người bấm).
 */
class AccountNotification extends Notification
{
    use Queueable;

    /** @param array<string, mixed> $meta */
    public function __construct(
        Account $account,
        private readonly string $template,
        private readonly ?string $actionUrl = null,
        private readonly array $meta = [],
    ) {
        $this->locale($account->locale ?: config('app.locale'));
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('notifications.account.'.str_replace('-', '_', $this->template).'.subject'))
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

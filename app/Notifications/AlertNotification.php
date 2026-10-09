<?php

namespace App\Notifications;

use App\Models\User;
use App\Notifications\Channels\WebPushChannel;
use App\Services\Admin\Alerts\AlertMessage;
use App\Services\Branding\BrandAssets;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

// Cảnh báo vận hành gửi super admin: sự cố mở, hồi phục, hoặc thư thử. Gửi đồng bộ,
// KHÔNG qua hàng đợi: chính hàng đợi ứ hay worker chết là thứ cần báo.
class AlertNotification extends Notification
{
    public function __construct(public readonly AlertMessage $message) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        $channels = [];

        if ($notifiable instanceof User && (string) $notifiable->email !== '') {
            $channels[] = 'mail';
        }

        if ($notifiable instanceof User && $notifiable->browserPushSubscriptions()->exists()) {
            $channels[] = WebPushChannel::class;
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject($this->message->subject)
            ->greeting($this->message->title);

        foreach ($this->message->lines as $line) {
            $mail->line($line);
        }

        return $mail
            ->action($this->message->actionLabel, $this->message->actionUrl)
            ->line(__('admin_alerts.MAIL.FOOTER', ['url' => $this->message->manageUrl]))
            ->salutation(__('admin_alerts.MAIL.SALUTATION'));
    }

    /** @return array{title: string, body: string, tag: string, url: string, icon: string} */
    public function toWebPush(object $notifiable): array
    {
        return [
            'title' => $this->message->subject,
            'body' => implode(' ', $this->message->lines),
            'tag' => $this->message->tag,
            'url' => $this->message->actionUrl,
            'icon' => url(app(BrandAssets::class)->logoThumbnail()),
        ];
    }
}

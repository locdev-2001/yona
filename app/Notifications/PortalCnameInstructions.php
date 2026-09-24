<?php

namespace App\Notifications;

use App\Models\Portal;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

// Hướng dẫn trỏ CNAME cho tên miền riêng của portal.
class PortalCnameInstructions extends Notification
{
    use Queueable;

    public function __construct(private readonly Portal $portal) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Finish setting up :domain', ['domain' => $this->portal->custom_domain]))
            ->line(__('Add this DNS record to point your domain at the help center:'))
            ->line($this->cnameRecord())
            ->line(__('The help center goes live once the record propagates.'));
    }

    public function cnameRecord(): string
    {
        return $this->portal->custom_domain.' CNAME '.self::targetDomain();
    }

    private static function targetDomain(): string
    {
        $url = (string) (config('app.helpcenter_url') ?: config('app.url'));
        $host = parse_url($url, PHP_URL_HOST);

        return is_string($host) && $host !== '' ? $host : $url;
    }
}

<?php

namespace App\Services\Email;

use App\Models\Channel\Email;
use App\Models\Inbox;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\SentMessage;
use Illuminate\Support\Facades\Mail;

/**
 * Port từ `set_delivery_method` + `oauth_smtp_settings` của
 * conversation_reply_mailer_helper.rb: inbox email có SMTP riêng thì thư đi bằng
 * SMTP của chính nó, còn lại dùng mailer mặc định của cài đặt.
 * Đây là ĐIỂM DUY NHẤT quyết định đường gửi — Mailable không biết gì về SMTP.
 */
class ChannelMailer
{
    public static function send(Inbox $inbox, Mailable $mailable): ?SentMessage
    {
        $settings = self::smtpSettingsFor($inbox);

        if ($settings === null) {
            return Mail::send($mailable);
        }

        // Đăng ký cấu hình của kênh thành một mailer có tên rồi gửi qua đó —
        // Mail::build() dựng mailer ngoài manager nên mọi lớp bọc (kể cả
        // Mail::fake của test) không thấy thư đi.
        $name = 'channel_email_'.$inbox->id;
        config(["mail.mailers.{$name}" => $settings]);

        return Mail::mailer($name)->send($mailable);
    }

    /** @return array<string, mixed>|null */
    public static function smtpSettingsFor(Inbox $inbox): ?array
    {
        if (! $inbox->isEmail()) {
            return null;
        }

        /** @var Email $channel */
        $channel = $inbox->channel;

        if ($channel->imap_enabled && self::oauthProviderDomain($channel) !== null) {
            return self::baseSmtpSettings((string) self::oauthProviderDomain($channel), $channel);
        }

        if (! $channel->smtp_enabled) {
            return null;
        }

        return [
            'transport' => 'smtp',
            'host' => $channel->smtp_address,
            'port' => $channel->smtp_port,
            'username' => $channel->smtp_login,
            'password' => $channel->smtp_password,
            'local_domain' => $channel->smtp_domain ?: null,
            'encryption' => $channel->smtp_enable_ssl_tls ? 'tls' : null,
            'verify_peer' => $channel->smtp_openssl_verify_mode !== 'none',
            'timeout' => config('mail.smtp_read_timeout'),
        ];
    }

    private static function oauthProviderDomain(Email $channel): ?string
    {
        return match (true) {
            $channel->isGoogle() => 'smtp.gmail.com',
            $channel->isMicrosoft() => 'smtp.office365.com',
            default => null,
        };
    }

    /** @return array<string, mixed> */
    private static function baseSmtpSettings(string $domain, Email $channel): array
    {
        return [
            'transport' => 'smtp',
            'host' => $domain,
            'port' => 587,
            'username' => $channel->imap_login,
            'password' => $channel->provider_config['access_token'] ?? null,
            'local_domain' => $domain,
            'encryption' => 'tls',
            'verify_peer' => false,
            'timeout' => config('mail.smtp_read_timeout'),
        ];
    }
}

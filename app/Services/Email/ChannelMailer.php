<?php

namespace App\Services\Email;

use App\Models\Channel\Email;
use App\Models\Inbox;
use App\Services\Email\OAuth\EmailOAuthProviders;
use App\Services\Email\OAuth\EmailOAuthTokenManager;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailer;
use Illuminate\Mail\SentMessage;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Transport\Smtp\Auth\XOAuth2Authenticator;
use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;

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
        // Mailer có tên được manager giữ lại: dựng lại mỗi lần để không dùng access token cũ.
        app('mail.manager')->purge($name);
        $mailer = Mail::mailer($name);

        if (($settings['auth_mode'] ?? null) === 'xoauth2' && $mailer instanceof Mailer) {
            $transport = $mailer->getSymfonyTransport();

            if ($transport instanceof EsmtpTransport) {
                $transport->setAuthenticators([new XOAuth2Authenticator]);
            }
        }

        return $mailer->send($mailable);
    }

    /** @return array<string, mixed>|null */
    public static function smtpSettingsFor(Inbox $inbox): ?array
    {
        if (! $inbox->isEmail()) {
            return null;
        }

        /** @var Email $channel */
        $channel = $inbox->channel;

        if ($channel->usesOAuth()) {
            $provider = EmailOAuthProviders::forChannel($channel);

            return $provider ? self::oauthSmtpSettings($provider->smtpHost(), $channel) : null;
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

    /** @return array<string, mixed> SMTP XOAUTH2 (cổng 587, STARTTLS) bằng access token còn hạn. */
    private static function oauthSmtpSettings(string $host, Email $channel): array
    {
        return [
            'transport' => 'smtp',
            'host' => $host,
            'port' => 587,
            'username' => $channel->imap_login ?: $channel->email,
            'password' => app(EmailOAuthTokenManager::class)->accessToken($channel),
            'auth_mode' => 'xoauth2',
            'timeout' => config('mail.smtp_read_timeout'),
        ];
    }
}

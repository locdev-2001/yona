<?php

namespace App\Services\Email;

use App\Models\Channel\Email;
use App\Services\Channels\VerifiesChannelCredentials;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

/**
 * Thử đăng nhập IMAP (và SMTP nếu bật) khi người dùng đổi cấu hình máy chủ thư.
 * Hộp thư nối qua OAuth (provider google/microsoft) do luồng OAuth kiểm, không qua đây.
 */
class EmailConnectionVerifier implements VerifiesChannelCredentials
{
    private const IMAP_FIELDS = [
        'imap_enabled', 'imap_address', 'imap_port', 'imap_login', 'imap_password', 'imap_enable_ssl', 'imap_authentication',
    ];

    private const SMTP_FIELDS = [
        'smtp_enabled', 'smtp_address', 'smtp_port', 'smtp_login', 'smtp_password', 'smtp_enable_ssl_tls', 'smtp_openssl_verify_mode',
    ];

    public function __construct(private readonly MailServerProbe $probe) {}

    public function verify(Model $channel): void
    {
        /** @var Email $channel */
        if (filled($channel->provider)) {
            return;
        }

        $errors = [];
        $imapChecked = false;

        if ($channel->imap_enabled && $channel->isDirty(self::IMAP_FIELDS)) {
            try {
                $this->probe->checkImap(
                    (string) $channel->imap_address,
                    (int) $channel->imap_port,
                    (bool) $channel->imap_enable_ssl,
                    (string) $channel->imap_login,
                    $channel->imap_password,
                );
                $imapChecked = true;
            } catch (MailServerException $exception) {
                $errors['channel.imap_password'] = $exception->userMessage();
            }
        }

        if ($channel->smtp_enabled && $channel->isDirty(self::SMTP_FIELDS)) {
            try {
                $this->probe->checkSmtp(
                    (string) $channel->smtp_address,
                    (int) $channel->smtp_port,
                    (bool) $channel->smtp_enable_ssl_tls,
                    (string) $channel->smtp_login,
                    $channel->smtp_password,
                    $channel->smtp_openssl_verify_mode !== 'none',
                );
            } catch (MailServerException $exception) {
                $errors['channel.smtp_password'] = $exception->userMessage();
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        // Kết nối lại thành công: gỡ cờ lỗi để job quét thư chạy tiếp.
        if ($imapChecked && $channel->exists) {
            $channel->reauthorized();
        }
    }
}

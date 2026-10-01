<?php

namespace App\Services\Email;

/**
 * Máy chủ thư chuẩn của các nhà cung cấp phổ biến — một nguồn cho form "Thêm kênh"
 * (tự điền), lời nhắc App Password và luồng OAuth.
 */
final class EmailProviderPresets
{
    public const GMAIL_APP_PASSWORD_URL = 'https://myaccount.google.com/apppasswords';

    public const MICROSOFT_APP_PASSWORD_URL = 'https://account.live.com/proofs/AppPassword';

    /** @var array<string, array<string, string|int|bool>> */
    private const PRESETS = [
        'gmail' => [
            'imap_address' => 'imap.gmail.com',
            'imap_port' => 993,
            'imap_enable_ssl' => true,
            'smtp_address' => 'smtp.gmail.com',
            'smtp_port' => 587,
            'smtp_enable_starttls_auto' => true,
            'smtp_enable_ssl_tls' => false,
        ],
        'outlook' => [
            'imap_address' => 'outlook.office365.com',
            'imap_port' => 993,
            'imap_enable_ssl' => true,
            'smtp_address' => 'smtp.office365.com',
            'smtp_port' => 587,
            'smtp_enable_starttls_auto' => true,
            'smtp_enable_ssl_tls' => false,
        ],
    ];

    /** @return array<string, string|int|bool> */
    public static function for(string $preset): array
    {
        return self::PRESETS[$preset] ?? [];
    }

    public static function isGmailHost(string $host): bool
    {
        $host = strtolower($host);

        return str_ends_with($host, 'gmail.com') || str_ends_with($host, 'googlemail.com');
    }

    public static function isMicrosoftHost(string $host): bool
    {
        $host = strtolower($host);

        return str_ends_with($host, 'office365.com') || str_ends_with($host, 'outlook.com') || str_ends_with($host, 'hotmail.com');
    }
}

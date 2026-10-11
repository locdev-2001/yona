<?php

namespace App\Services\Meta;

/**
 * Phiên bản Graph API dùng chung cho mọi kênh Meta (Messenger, Instagram, WhatsApp
 * Cloud). Đổi phiên bản = đổi META_API_VERSION, không ghim số ở driver.
 */
final class GraphApi
{
    public const DEFAULT_VERSION = 'v26.0';

    public const FACEBOOK_HOST = 'https://graph.facebook.com';

    public const INSTAGRAM_HOST = 'https://graph.instagram.com';

    public static function version(): string
    {
        return (string) config('services.meta.api_version', self::DEFAULT_VERSION);
    }

    public static function baseUri(string $host = self::FACEBOOK_HOST): string
    {
        return rtrim($host, '/').'/'.self::version();
    }
}

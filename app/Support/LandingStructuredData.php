<?php

namespace App\Support;

/**
 * JSON-LD cho bề mặt công khai.
 *
 * Sinh ở SERVER, không ở React: bot tìm kiếm đọc HTML thô, thứ chạy sau khi
 * JavaScript mount thì nhiều bot không thấy.
 *
 * Chỉ khai thông tin có thể xác minh. Các URL cũ đang hiện trang chủ dùng cùng
 * loại WebSite, không giả làm trang dịch vụ hay trang liên hệ riêng.
 */
final class LandingStructuredData
{
    public static function make(string $page, array $meta): array
    {
        $to_chuc = self::toChuc();

        return match ($page) {
            'home', 'zalo_personal', 'demo' => [$to_chuc, self::trangWeb($meta)],
            default => [$to_chuc],
        };
    }

    private static function toChuc(): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'Organization',
            'name' => config('yona.branding.brand_name'),
            'url' => route('home'),
            'logo' => url(config('yona.branding.logo')),
        ];
    }

    private static function trangWeb(array $meta): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'WebSite',
            'name' => config('yona.branding.brand_name'),
            'url' => route('home'),
            'inLanguage' => str_replace('_', '-', app()->getLocale()),
            'description' => $meta['description'],
        ];
    }
}

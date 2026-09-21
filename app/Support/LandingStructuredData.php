<?php

namespace App\Support;

/**
 * JSON-LD cho bề mặt công khai.
 *
 * Sinh ở SERVER, không ở React: bot tìm kiếm đọc HTML thô, thứ chạy sau khi
 * JavaScript mount thì nhiều bot không thấy.
 *
 * Chỉ khai thứ KIỂM ĐƯỢC. Không `aggregateRating`, không `review`, không
 * `offers` — Yona chưa có gói cước nào, và đánh giá bịa là thứ Google phạt
 * nặng nhất trong nhóm structured data. Không `SoftwareApplication` cho trang
 * Zalo vì nó mô tả một phần mềm tải về; Yona là dịch vụ chạy trên web.
 */
final class LandingStructuredData
{
    public static function make(string $page, array $meta): array
    {
        $to_chuc = self::toChuc();

        return match ($page) {
            'home' => [$to_chuc, self::trangWeb($meta)],
            'zalo_personal' => [$to_chuc, self::dichVu($meta)],
            'demo' => [$to_chuc, self::trangLienHe($meta)],
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

    private static function dichVu(array $meta): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'Service',
            'name' => $meta['title'],
            'description' => $meta['description'],
            'url' => route('channels.zalo_personal'),
            'serviceType' => trans('landing.zalo_page.hero.eyebrow'),
            'areaServed' => ['@type' => 'Country', 'name' => 'Việt Nam'],
            'provider' => ['@type' => 'Organization', 'name' => config('yona.branding.brand_name')],
        ];
    }

    private static function trangLienHe(array $meta): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'ContactPage',
            'name' => $meta['title'],
            'description' => $meta['description'],
            'url' => route('demo_request.create'),
        ];
    }
}

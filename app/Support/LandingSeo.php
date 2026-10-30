<?php

namespace App\Support;

final class LandingSeo
{
    private const PAGES = [
        'home' => 'home',
        'terms' => 'legal.terms',
        'privacy' => 'legal.privacy',
    ];

    public static function forPage(string $page): array
    {
        $canonicalPage = in_array($page, ['zalo_personal', 'demo', 'demo_thanks'], true) ? 'home' : $page;
        $baseUrl = isset(self::PAGES[$canonicalPage]) ? route(self::PAGES[$canonicalPage]) : url()->current();
        $alternates = array_map(fn (string $locale) => [
            'locale' => $locale,
            'url' => self::localizedUrl($baseUrl, $locale),
        ], self::locales());

        return [
            'canonical' => self::localizedUrl($baseUrl, app()->getLocale()),
            'alternates' => $alternates,
            // app.locale đổi theo request; x-default phải giữ nguyên khi đổi ngôn ngữ.
            'default' => self::localizedUrl($baseUrl, config('app.fallback_locale')),
        ];
    }

    public static function sitemapUrls(): array
    {
        $urls = [];

        foreach (self::PAGES as $routeName) {
            foreach (self::locales() as $locale) {
                $urls[] = self::localizedUrl(route($routeName), $locale);
            }
        }

        return $urls;
    }

    private static function locales(): array
    {
        return array_column(config('yona.available_locales', []), 'iso_639_1_code');
    }

    private static function localizedUrl(string $baseUrl, string $locale): string
    {
        return $baseUrl.'?'.http_build_query(['locale' => $locale]);
    }
}

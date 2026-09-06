<?php

namespace App\Support\HelpCenter;

// Port của app/helpers/portal_helper.rb — phần dựng URL và màu động của trang
// help center công khai. Đặt ở một chỗ để view chỉ gọi, không tự ghép chuỗi.
final class PortalLinks
{
    public static function queryString(?string $theme, bool $isPlainLayout): string
    {
        $params = [];

        if (filled($theme) && $theme !== 'system') {
            $params['theme'] = $theme;
        }

        if ($isPlainLayout) {
            $params['show_plain_layout'] = 'true';
        }

        return $params === [] ? '' : '?'.http_build_query($params);
    }

    public static function home(string $portalSlug, ?string $locale, ?string $theme, bool $isPlainLayout): string
    {
        $path = '/hc/'.$portalSlug.'/'.$locale;

        return $isPlainLayout ? $path.self::queryString($theme, true) : $path;
    }

    public static function category(string $portalSlug, ?string $locale, string $categorySlug, ?string $theme, bool $isPlainLayout): string
    {
        $path = '/hc/'.$portalSlug.'/'.$locale.'/categories/'.$categorySlug;

        return $isPlainLayout ? $path.self::queryString($theme, true) : $path;
    }

    public static function article(string $portalSlug, string $articleSlug, ?string $theme, bool $isPlainLayout): string
    {
        $path = '/hc/'.$portalSlug.'/articles/'.$articleSlug;

        return $isPlainLayout ? $path.self::queryString($theme, true) : $path;
    }

    public static function background(string $portalColor, string $theme): string
    {
        return 'color-mix(in srgb, '.$portalColor.' 20%, '.($theme === 'dark' ? 'black' : 'white').')';
    }

    public static function backgroundGradient(string $theme): string
    {
        return 'linear-gradient(to bottom, transparent, '.($theme === 'dark' ? '#151718' : 'white').')';
    }

    public static function hoverBackground(string $portalColor, string $theme): string
    {
        return 'color-mix(in srgb, '.$portalColor.' 5%, '.($theme === 'dark' ? '#1B1B1B' : '#F9F9F9').')';
    }

    // thumbnail_bg_color: cùng bảng ba màu, cùng phép chia lấy dư theo độ dài tên.
    public static function thumbnailBackground(?string $name): string
    {
        $colors = ['#6D95BA', '#A4C3C3', '#E19191'];

        return blank($name) ? $colors[0] : $colors[mb_strlen((string) $name) % count($colors)];
    }

    // render_emoji_or_icon: tên icon `ri` thuần ascii thành <span class="i-ri-...">,
    // còn lại coi là emoji và chỉ escape.
    public static function emojiOrIcon(?string $value, ?string $color = null): string
    {
        if (blank($value)) {
            return '';
        }

        $value = (string) $value;

        if (preg_match('/\A[a-z][a-z0-9-]*\z/', $value) !== 1) {
            return e($value);
        }

        $class = str_starts_with($value, 'i-') ? $value : 'i-ri-'.$value;
        $style = preg_match('/\A#[0-9a-fA-F]{3,8}\z/', (string) $color) === 1
            ? ' style="color: '.e($color).';"'
            : '';

        return '<span class="'.e($class).'"'.$style.' aria-hidden="true"></span>';
    }
}

<?php

namespace App\Support\HelpCenter;

// Port của app/helpers/portal_helper.rb — phần dựng URL và màu động của trang
// help center công khai. Đặt ở một chỗ để view chỉ gọi, không tự ghép chuỗi.
final class PortalLinks
{
    public static function queryString(bool $isPlainLayout): string
    {
        $params = [];

        if ($isPlainLayout) {
            $params['show_plain_layout'] = 'true';
        }

        return $params === [] ? '' : '?'.http_build_query($params);
    }

    public static function home(string $portalSlug, ?string $locale, bool $isPlainLayout): string
    {
        $path = '/hc/'.$portalSlug.'/'.$locale;

        return $isPlainLayout ? $path.self::queryString(true) : $path;
    }

    public static function category(string $portalSlug, ?string $locale, string $categorySlug, bool $isPlainLayout): string
    {
        $path = '/hc/'.$portalSlug.'/'.$locale.'/categories/'.$categorySlug;

        return $isPlainLayout ? $path.self::queryString(true) : $path;
    }

    public static function article(string $portalSlug, string $articleSlug, bool $isPlainLayout): string
    {
        $path = '/hc/'.$portalSlug.'/articles/'.$articleSlug;

        return $isPlainLayout ? $path.self::queryString(true) : $path;
    }

    public static function background(string $portalColor): string
    {
        return 'color-mix(in srgb, '.$portalColor.' 20%, white)';
    }

    public static function backgroundGradient(): string
    {
        return 'linear-gradient(to bottom, transparent, white)';
    }

    public static function hoverBackground(string $portalColor): string
    {
        return 'color-mix(in srgb, '.$portalColor.' 5%, #F9F9F9)';
    }

    /**
     * Màu thương hiệu của portal dùng cho trạng thái hover, đã kéo cho đủ tương phản
     * trên nền trắng. Màu tenant tự chọn có thể quá nhạt để mang chữ; công thức WCAG
     * dưới đây trộn dần về phía tối cho tới khi đạt ngưỡng.
     *
     * Port từ resources/js/portal/colorContrast.ts (đã xoá cùng theme switcher). Tính
     * ở backend vì các biến CSS chị em (--dynamic-hover-bg-color, --dynamic-portal-bg)
     * cũng sinh ở đây, và giá trị không còn phụ thuộc theme nên không cần chạy ở client.
     */
    public static function hoverColor(string $portalColor): string
    {
        $target = 3.1;
        $maxIterations = 60;
        $mixWeight = 0.05;
        $ink = ['r' => 21.0, 'g' => 23.0, 'b' => 24.0];

        $color = self::parseColor($portalColor);

        if ($color === null) {
            return sprintf('#%02x%02x%02x', (int) $ink['r'], (int) $ink['g'], (int) $ink['b']);
        }

        $background = ['r' => 255.0, 'g' => 255.0, 'b' => 255.0];

        // Nền luôn trắng, nên lối duy nhất đạt tương phản là tối dần về phía mực.
        // Bản TS cũ còn nhánh trộn về trắng (cho nền tối) — bỏ đi cùng dark mode,
        // vì trên nền trắng nó đẩy màu đi sai hướng và không bao giờ hội tụ.
        for ($i = 0; $i < $maxIterations; $i++) {
            if (self::contrastRatio($color, $background) >= $target) {
                break;
            }

            $color = [
                'r' => $color['r'] + ($ink['r'] - $color['r']) * $mixWeight,
                'g' => $color['g'] + ($ink['g'] - $color['g']) * $mixWeight,
                'b' => $color['b'] + ($ink['b'] - $color['b']) * $mixWeight,
            ];
        }

        return sprintf(
            '#%02x%02x%02x',
            (int) round(max(0, min(255, $color['r']))),
            (int) round(max(0, min(255, $color['g']))),
            (int) round(max(0, min(255, $color['b']))),
        );
    }

    /**
     * @return array{r: float, g: float, b: float}|null null khi màu không đọc được
     */
    private static function parseColor(string $color): ?array
    {
        $hex = ltrim(trim($color), '#');

        if (strlen($hex) === 3) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }

        if (preg_match('/\A[0-9a-fA-F]{6}\z/', $hex) !== 1) {
            return null;
        }

        return [
            'r' => (float) hexdec(substr($hex, 0, 2)),
            'g' => (float) hexdec(substr($hex, 2, 2)),
            'b' => (float) hexdec(substr($hex, 4, 2)),
        ];
    }

    /**
     * @param  array{r: float, g: float, b: float}  $color
     */
    private static function relativeLuminance(array $color): float
    {
        $channel = static function (float $value): float {
            $normalized = $value / 255;

            return $normalized <= 0.03928
                ? $normalized / 12.92
                : (($normalized + 0.055) / 1.055) ** 2.4;
        };

        return 0.2126 * $channel($color['r'])
            + 0.7152 * $channel($color['g'])
            + 0.0722 * $channel($color['b']);
    }

    /**
     * @param  array{r: float, g: float, b: float}  $a
     * @param  array{r: float, g: float, b: float}  $b
     */
    private static function contrastRatio(array $a, array $b): float
    {
        $first = self::relativeLuminance($a);
        $second = self::relativeLuminance($b);
        $lighter = max($first, $second);
        $darker = min($first, $second);

        return ($lighter + 0.05) / ($darker + 0.05);
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

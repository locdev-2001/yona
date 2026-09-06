<?php

namespace App\Support;

/**
 * Port thu gọn của `Liquid::Template.parse(...).render(drops)` mà Chatwoot dùng
 * trong `app/models/concerns/liquidable.rb`: CHỈ thay biến `{{ a.b }}`.
 *
 * Filter (`| upcase`), tag (`{% if %}`) và template WhatsApp chưa cần cho nhóm C
 * — khi cần, đổi lớp này sang một thư viện Liquid thật, mọi call-site giữ nguyên.
 */
final class LiquidTemplate
{
    // `{% raw %}` quanh code block của bản gốc: nội dung trong dấu ` không được thay.
    private const PATTERN = '/`[^`]*`|\{\{\s*([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)\s*\}\}/s';

    /** @param array<string, mixed> $variables */
    public static function render(string $template, array $variables): string
    {
        return (string) preg_replace_callback(
            self::PATTERN,
            function (array $match) use ($variables): string {
                if (! isset($match[1])) {
                    return $match[0];
                }

                $value = data_get($variables, $match[1]);

                // Liquid in ra chuỗi rỗng cho biến không tồn tại hoặc nil.
                return is_scalar($value) ? (string) $value : '';
            },
            $template,
        );
    }
}

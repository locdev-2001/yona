<?php

namespace App\Services\Webhooks;

/**
 * Ảnh chụp payload thô của nền tảng nhắn tin (`zca_message`, gói `sticker`…) chỉ
 * tồn tại để driver dựng lại lời trích dẫn / thu hồi ở CHIỀU GỬI. Nó mang uid nền
 * tảng, link CDN và chuỗi nội bộ của người thật, còn bên nhận webhook không đọc
 * tới. Cắt ở đúng cửa ra HTTP — một chỗ duy nhất cho cả ba loại webhook (tài
 * khoản, inbox API, agent bot) — thay vì rải ở từng driver.
 *
 * Danh sách khoá khai báo ở `config/webhooks.php` để lõi không mang tên riêng của
 * kênh nào trong mã.
 */
final class PayloadRedactor
{
    private const ATTRIBUTE_MAP_KEY = 'content_attributes';

    private const MAX_DEPTH = 8;

    /**
     * @param  array<mixed>  $payload
     * @return array<mixed>
     */
    public static function redact(array $payload): array
    {
        $keys = self::redactedKeys();

        return $keys === [] ? $payload : self::scrub($payload, $keys, 0);
    }

    /** @return list<string> */
    private static function redactedKeys(): array
    {
        $configured = config('webhooks.redacted_content_attributes', []);

        return array_values(array_filter(
            array_map(fn ($key) => is_string($key) ? $key : '', is_array($configured) ? $configured : []),
        ));
    }

    /**
     * @param  array<mixed>  $node
     * @param  list<string>  $keys
     * @return array<mixed>
     */
    private static function scrub(array $node, array $keys, int $depth): array
    {
        if ($depth > self::MAX_DEPTH) {
            return $node;
        }

        foreach ($node as $key => $value) {
            if (! is_array($value)) {
                continue;
            }

            if ($key === self::ATTRIBUTE_MAP_KEY) {
                $node[$key] = array_diff_key($value, array_flip($keys));

                continue;
            }

            $node[$key] = self::scrub($value, $keys, $depth + 1);
        }

        return $node;
    }
}

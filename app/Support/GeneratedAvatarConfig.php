<?php

namespace App\Support;

use InvalidArgumentException;

/**
 * Cấu hình avatar hình khối người dùng tự chỉnh: một "tên" (seed) và các trục đã ghim.
 * Mỗi trục là vị trí trong [0, 1] mà thư viện dựng hình đọc thay cho giá trị băm từ tên,
 * hoặc một danh sách vị trí để tên chọn trong số đó. Danh sách trục do giao diện quyết định;
 * máy chủ chỉ giữ hình dạng dữ liệu an toàn, thư viện tự kẹp giá trị khi dựng.
 */
final class GeneratedAvatarConfig
{
    public const NAME_MAX_LENGTH = 32;

    private const NAME_PATTERN = '/^[\p{L}\p{N} ._:@-]+$/u';

    private const TRAIT_KEY_PATTERN = '/^[a-z]+(\.[a-z0-9]+)?$/';

    private const MAX_TRAITS = 40;

    private const MAX_CHOICES = 12;

    public static function isValidName(string $name): bool
    {
        return mb_strlen($name) <= self::NAME_MAX_LENGTH && preg_match(self::NAME_PATTERN, $name) === 1;
    }

    /**
     * @return array<string, float|list<float>>|null null khi không ghim trục nào
     *
     * @throws InvalidArgumentException
     */
    public static function sanitizeTraits(mixed $traits): ?array
    {
        if ($traits === null || $traits === []) {
            return null;
        }

        if (! is_array($traits) || array_is_list($traits) || count($traits) > self::MAX_TRAITS) {
            throw new InvalidArgumentException('traits');
        }

        $clean = [];
        foreach ($traits as $key => $value) {
            if (! is_string($key) || preg_match(self::TRAIT_KEY_PATTERN, $key) !== 1) {
                throw new InvalidArgumentException('traits');
            }

            $clean[$key] = is_array($value) ? self::positions($value) : self::position($value);
        }

        return $clean;
    }

    /** @return list<float> */
    private static function positions(array $values): array
    {
        if (! array_is_list($values) || $values === [] || count($values) > self::MAX_CHOICES) {
            throw new InvalidArgumentException('traits');
        }

        return array_map(self::position(...), $values);
    }

    private static function position(mixed $value): float
    {
        if (! is_int($value) && ! is_float($value)) {
            throw new InvalidArgumentException('traits');
        }

        return max(0.0, min(1.0, (float) $value));
    }
}

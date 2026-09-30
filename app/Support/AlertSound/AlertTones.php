<?php

namespace App\Support\AlertSound;

/**
 * Danh sách âm báo tin mới. Đọc từ cùng tệp JSON giao diện import
 * (resources/js/shared/alertSound/alertTones.json) để máy chủ và giao diện không
 * bao giờ lệch nhau; mỗi âm là một tệp public/audio/alerts/{tên}.mp3.
 */
final class AlertTones
{
    private const CATALOG_PATH = 'js/shared/alertSound/alertTones.json';

    private static ?array $catalog = null;

    /** @return list<string> */
    public static function all(): array
    {
        return self::catalog()['tones'];
    }

    public static function default(): string
    {
        return self::catalog()['default'];
    }

    public static function orDefault(mixed $tone): string
    {
        return in_array($tone, self::all(), true) ? $tone : self::default();
    }

    private static function catalog(): array
    {
        return self::$catalog ??= json_decode(
            (string) file_get_contents(resource_path(self::CATALOG_PATH)),
            true,
            flags: JSON_THROW_ON_ERROR,
        );
    }
}

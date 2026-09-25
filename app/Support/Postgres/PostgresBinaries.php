<?php

namespace App\Support\Postgres;

use RuntimeException;

/**
 * Dò đường dẫn binary PostgreSQL phía client (pg_dump, pg_restore, createdb,
 * dropdb). aaPanel không thêm cụm PostgreSQL của nó vào PATH
 * (`/www/server/pgsql/bin`), nên `command -v` trượt trên production dù
 * deploy.sh đã tự dò cùng đường dẫn này cho psql (mục 4 docs/deployment.md).
 * Đè bằng biến môi trường PG_BIN_DIR nếu cụm cài ở chỗ khác.
 */
final class PostgresBinaries
{
    private const FALLBACK_DIR = '/www/server/pgsql/bin';

    public static function resolve(string $binary): string
    {
        $override = (string) env('PG_BIN_DIR', '');
        if ($override !== '') {
            $path = rtrim($override, '/').'/'.$binary;
            if (is_executable($path)) {
                return $path;
            }
        }

        $found = self::which($binary);
        if ($found !== null) {
            return $found;
        }

        $fallback = self::FALLBACK_DIR.'/'.$binary;
        if (is_executable($fallback)) {
            return $fallback;
        }

        throw new RuntimeException(
            "Không tìm thấy binary PostgreSQL '{$binary}'. Cài client PostgreSQL hoặc đặt PG_BIN_DIR."
        );
    }

    private static function which(string $binary): ?string
    {
        $path = trim((string) shell_exec('command -v '.escapeshellarg($binary).' 2>/dev/null'));

        return $path !== '' ? $path : null;
    }
}

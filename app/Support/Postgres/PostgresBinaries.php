<?php

namespace App\Support\Postgres;

use RuntimeException;
use Symfony\Component\Process\ExecutableFinder;

/**
 * Dò đường dẫn binary PostgreSQL phía client (pg_dump, pg_restore). aaPanel
 * không thêm cụm PostgreSQL của nó vào PATH (/www/server/pgsql/bin), nên dò
 * thêm thư mục này làm phương án dự phòng (mục 4 docs/deployment.md dò cùng
 * đường dẫn này cho psql).
 */
final class PostgresBinaries
{
    private const FALLBACK_DIR = '/www/server/pgsql/bin';

    public static function resolve(string $binary): string
    {
        $found = (new ExecutableFinder)->find($binary, null, [self::FALLBACK_DIR]);

        if ($found === null) {
            throw new RuntimeException(
                "Không tìm thấy binary PostgreSQL '{$binary}'. Cài client PostgreSQL hoặc thêm vào PATH."
            );
        }

        return $found;
    }
}

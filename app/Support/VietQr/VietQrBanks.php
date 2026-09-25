<?php

namespace App\Support\VietQr;

/** Đọc danh sách ngân hàng tĩnh ở config/vietqr_banks.php. */
final class VietQrBanks
{
    public static function all(): array
    {
        return config('vietqr_banks', []);
    }

    public static function find(string $bin): ?array
    {
        foreach (self::all() as $bank) {
            if ($bank['bin'] === $bin) {
                return $bank;
            }
        }

        return null;
    }

    public static function bins(): array
    {
        return array_column(self::all(), 'bin');
    }
}

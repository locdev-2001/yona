<?php

namespace App\Support;

/**
 * Mã hoá base62 (0-9A-Za-z) không cần ext-gmp/bcmath — nhân-cộng thủ công trên
 * mảng byte, đủ nhanh cho chuỗi ngắn như token truy cập.
 */
final class Base62
{
    private const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    /** Token ngẫu nhiên từ `$bytes` byte thật (mặc định 32 = 256 bit), không đoán được. */
    public static function randomToken(int $bytes = 32): string
    {
        return self::encode(random_bytes($bytes));
    }

    public static function encode(string $binary): string
    {
        $digits = [0];

        foreach (unpack('C*', $binary) as $byte) {
            $carry = $byte;

            foreach ($digits as &$digit) {
                $carry += $digit * 256;
                $digit = $carry % 62;
                $carry = intdiv($carry, 62);
            }
            unset($digit);

            while ($carry > 0) {
                $digits[] = $carry % 62;
                $carry = intdiv($carry, 62);
            }
        }

        $encoded = implode('', array_map(fn (int $digit) => self::ALPHABET[$digit], array_reverse($digits)));

        return ltrim($encoded, '0') ?: '0';
    }
}

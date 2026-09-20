<?php

namespace App\Support;

/**
 * Chuẩn hoá số điện thoại Việt về E.164.
 *
 * Contact bắt buộc `phone_number` đúng E.164 (Contact::PHONE_NUMBER_REGEX), còn
 * khách gõ vào form thì gõ kiểu Việt: `0912 345 678`, `0912.345.678`,
 * `84912345678`. Số điện thoại là khoá chống trùng của hồ sơ nên hai cách gõ
 * cùng một số phải ra cùng một chuỗi, nếu không một người thành hai hồ sơ.
 */
final class VietnamPhone
{
    public static function normalize(?string $input): ?string
    {
        if ($input === null) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $input) ?? '';

        $e164 = match (true) {
            str_starts_with($digits, '840') => '+84'.substr($digits, 3),
            str_starts_with($digits, '84') => '+84'.substr($digits, 2),
            str_starts_with($digits, '0') => '+84'.substr($digits, 1),
            $digits !== '' => '+84'.$digits,
            default => '',
        };

        // 9 chữ số là số di động (090…), 10 là số cố định vùng cũ còn dùng.
        return preg_match('/^\+84\d{9,10}$/', $e164) === 1 ? $e164 : null;
    }
}

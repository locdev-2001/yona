<?php

namespace App\Services\Admin\Operations;

use Illuminate\Support\Str;

// Nguồn duy nhất quyết định trường nào là bí mật trong console quản trị: nhật ký
// thao tác che payload và trình duyệt dữ liệu che cột cùng theo luật này.
final class SensitiveFields
{
    public const MASK = '••••';

    // So theo từng đoạn của tên (tách theo `_`, `-`, camelCase): `imap_password`,
    // `pageAccessToken`, `otp_backup_codes`, `api_key_sid` đều trúng.
    private const SENSITIVE_SEGMENTS = [
        'password', 'passwords', 'passwd', 'token', 'tokens', 'secret', 'secrets',
        'otp', 'mfa', 'key', 'keys', 'salt', 'credential', 'credentials', 'digest',
    ];

    // Tên trần không mang đoạn nào ở trên nhưng là mã xác thực (ô nhập mã 2FA).
    private const SENSITIVE_NAMES = ['code', 'codes', 'recovery_code', 'backup_code', 'verification_code'];

    public static function isSensitive(string $name): bool
    {
        $normalized = str_replace('-', '_', $name);
        $snake = $normalized === strtoupper($normalized) ? strtolower($normalized) : Str::snake($normalized);

        if (in_array($snake, self::SENSITIVE_NAMES, true)) {
            return true;
        }

        return array_intersect(explode('_', $snake), self::SENSITIVE_SEGMENTS) !== [];
    }

    /**
     * Che mọi khoá bí mật ở mọi tầng của một mảng lồng nhau.
     *
     * @param  array<array-key, mixed>  $values
     * @return array<array-key, mixed>
     */
    public static function maskTree(array $values): array
    {
        $masked = [];

        foreach ($values as $key => $value) {
            if (is_string($key) && self::isSensitive($key)) {
                $masked[$key] = $value === null ? null : self::MASK;
            } elseif (is_array($value)) {
                $masked[$key] = self::maskTree($value);
            } else {
                $masked[$key] = $value;
            }
        }

        return $masked;
    }
}

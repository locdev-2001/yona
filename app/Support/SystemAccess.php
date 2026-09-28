<?php

namespace App\Support;

use App\Models\User;

// Nguồn duy nhất của "tài khoản có quyền hệ thống": email user nằm trong
// YONA_SYSTEM_ADMIN_EMAILS (config yona.system_admin_emails).
final class SystemAccess
{
    private const EMAIL_SEPARATOR = ',';

    public static function isSystemAdmin(?User $user): bool
    {
        $email = self::normalizeEmail((string) $user?->email);

        return $email !== '' && in_array($email, self::systemAdminEmails(), true);
    }

    /** @return list<string> */
    public static function systemAdminEmails(): array
    {
        $configured = (string) config('yona.system_admin_emails', '');

        return array_values(array_filter(array_map(
            self::normalizeEmail(...),
            explode(self::EMAIL_SEPARATOR, $configured),
        ), fn (string $email) => $email !== ''));
    }

    private static function normalizeEmail(string $email): string
    {
        return mb_strtolower(trim($email));
    }
}

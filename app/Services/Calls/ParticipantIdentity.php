<?php

namespace App\Services\Calls;

// Định danh người trong phòng media: `user:{id}`. Lõi tự dựng và tự đọc, nên mọi nhà
// cung cấp chỉ chuyển nguyên chuỗi này qua lại.
final class ParticipantIdentity
{
    private const PREFIX = 'user:';

    public static function forUser(int $userId): string
    {
        return self::PREFIX.$userId;
    }

    public static function userId(?string $identity): ?int
    {
        if ($identity === null || ! str_starts_with($identity, self::PREFIX)) {
            return null;
        }

        $userId = substr($identity, strlen(self::PREFIX));

        return ctype_digit($userId) ? (int) $userId : null;
    }
}

<?php

namespace Tests\Support;

use SessionHandlerInterface;

// Đọc/ghi thẳng store phiên đang cấu hình (phpunit dùng driver `array`, production
// dùng `redis`) để test khẳng định "phiên của thiết bị kia đã bị hủy thật", không
// chỉ dòng user_sessions biến mất.
final class StoredSessions
{
    public static function handler(): SessionHandlerInterface
    {
        return app('session')->driver()->getHandler();
    }

    public static function put(string $clientId): void
    {
        self::handler()->write($clientId, serialize(['_token' => 'token-'.$clientId]));
    }

    public static function exists(string $clientId): bool
    {
        return self::handler()->read($clientId) !== '';
    }
}

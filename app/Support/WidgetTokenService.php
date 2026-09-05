<?php

namespace App\Support;

// Port từ refs/chatwoot/app/services/widget/token_service.rb: token nhận diện
// PHIÊN KHÁCH của widget — mang source_id + inbox_id, hạn mặc định 180 ngày.
// Khóa ký = APP_KEY (thay `Rails.application.secret_key_base`).
final class WidgetTokenService
{
    public const DEFAULT_EXPIRY_DAYS = 180;

    /** @param array<string, mixed> $payload */
    public static function generate(array $payload): string
    {
        $issuedAt = time();

        return Jwt::encode([
            ...$payload,
            'iat' => $issuedAt,
            'exp' => $issuedAt + self::expiryDays() * 86400,
        ], self::secret());
    }

    /** @return array<string, mixed> */
    public static function decode(?string $token): array
    {
        return blank($token) ? [] : Jwt::decode($token, self::secret());
    }

    private static function expiryDays(): int
    {
        return (int) (config('yona.widget_token_expiry_days') ?: self::DEFAULT_EXPIRY_DAYS);
    }

    private static function secret(): string
    {
        return (string) config('app.key');
    }
}

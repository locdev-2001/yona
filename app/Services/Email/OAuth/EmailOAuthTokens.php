<?php

namespace App\Services\Email\OAuth;

use Carbon\CarbonImmutable;

final class EmailOAuthTokens
{
    public function __construct(
        public readonly string $accessToken,
        public readonly ?string $refreshToken,
        public readonly CarbonImmutable $expiresAt,
        public readonly ?string $email = null,
    ) {}

    /** @param  array<string, mixed>  $payload  phản hồi của token endpoint */
    public static function fromTokenResponse(array $payload): self
    {
        return new self(
            (string) ($payload['access_token'] ?? ''),
            filled($payload['refresh_token'] ?? null) ? (string) $payload['refresh_token'] : null,
            CarbonImmutable::now()->addSeconds(max(60, (int) ($payload['expires_in'] ?? 3600))),
            self::emailFromIdToken($payload['id_token'] ?? null),
        );
    }

    /**
     * id_token đến thẳng từ token endpoint qua TLS nên chỉ đọc claim, không kiểm chữ ký
     * (cách OpenID Connect cho phép với luồng authorization code).
     */
    private static function emailFromIdToken(mixed $idToken): ?string
    {
        if (! is_string($idToken) || substr_count($idToken, '.') !== 2) {
            return null;
        }

        $claims = json_decode((string) base64_decode(strtr(explode('.', $idToken)[1], '-_', '+/'), true), true);

        if (! is_array($claims)) {
            return null;
        }

        $email = $claims['email'] ?? $claims['preferred_username'] ?? $claims['upn'] ?? null;

        return is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL) ? strtolower($email) : null;
    }
}

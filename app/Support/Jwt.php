<?php

namespace App\Support;

// Chỗ duy nhất biết
// định dạng JWT trong codebase. Gem `jwt` của Ruby thay bằng HS256 tự ký:
// chỉ cần một thuật toán, không cần thêm phụ thuộc.
final class Jwt
{
    private const ALGORITHM = 'HS256';

    /** @param array<string, mixed> $payload */
    public static function encode(array $payload, string $secret): string
    {
        $segments = [
            self::base64UrlEncode(json_encode(['alg' => self::ALGORITHM, 'typ' => 'JWT'], JSON_UNESCAPED_SLASHES)),
            self::base64UrlEncode(json_encode($payload, JSON_UNESCAPED_SLASHES)),
        ];

        $signingInput = implode('.', $segments);
        $segments[] = self::base64UrlEncode(hash_hmac('sha256', $signingInput, $secret, true));

        return implode('.', $segments);
    }

    /**
     * Chữ ký sai, token méo hoặc đã hết hạn đều trả mảng rỗng — đúng
     * `rescue JWT::ExpiredSignature, JWT::DecodeError` của bản gốc.
     *
     * @return array<string, mixed>
     */
    public static function decode(?string $token, string $secret): array
    {
        $segments = explode('.', (string) $token);

        if (count($segments) !== 3) {
            return [];
        }

        [$header, $payload, $signature] = $segments;

        $expected = self::base64UrlEncode(hash_hmac('sha256', "{$header}.{$payload}", $secret, true));

        if (! hash_equals($expected, $signature)) {
            return [];
        }

        $claims = json_decode((string) self::base64UrlDecode($payload), true);

        if (! is_array($claims)) {
            return [];
        }

        if (isset($claims['exp']) && time() >= (int) $claims['exp']) {
            return [];
        }

        return $claims;
    }

    private static function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $value): string
    {
        return (string) base64_decode(strtr($value, '-_', '+/'), true);
    }
}

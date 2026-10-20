<?php

namespace App\Services\Calls\Media\LiveKit;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use UnexpectedValueException;

// JWT HS256 ký bằng cặp API key/secret: dùng cho vé vào phòng, cho lời gọi API phòng và
// để kiểm webhook do máy chủ LiveKit ký.
final readonly class LiveKitTokenSigner
{
    private const ALGORITHM = 'HS256';

    private const CLOCK_LEEWAY_SECONDS = 30;

    public function __construct(private LiveKitCredentials $credentials) {}

    /** @param  array<string, mixed>  $claims */
    public function sign(array $claims, int $ttlSeconds): string
    {
        $issuedAt = time();

        return JWT::encode([
            ...$claims,
            'iss' => $this->credentials->apiKey(),
            'nbf' => $issuedAt,
            'exp' => $issuedAt + $ttlSeconds,
        ], $this->credentials->apiSecret(), self::ALGORITHM);
    }

    /**
     * @return array<string, mixed>
     *
     * @throws UnexpectedValueException chữ ký sai, hết hạn, hoặc không do key của mình phát
     */
    public function verify(string $token): array
    {
        // Đồng hồ máy LiveKit và máy app lệch vài giây không được làm hỏng webhook (nbf/exp).
        $previousLeeway = JWT::$leeway;
        JWT::$leeway = self::CLOCK_LEEWAY_SECONDS;

        try {
            $claims = (array) JWT::decode($token, new Key($this->credentials->apiSecret(), self::ALGORITHM));
        } finally {
            JWT::$leeway = $previousLeeway;
        }

        if (($claims['iss'] ?? null) !== $this->credentials->apiKey()) {
            throw new UnexpectedValueException('Token issued by an unknown API key');
        }

        return $claims;
    }
}

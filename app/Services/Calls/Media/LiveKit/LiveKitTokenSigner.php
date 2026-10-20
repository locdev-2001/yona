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
        $claims = (array) JWT::decode($token, new Key($this->credentials->apiSecret(), self::ALGORITHM));

        if (($claims['iss'] ?? null) !== $this->credentials->apiKey()) {
            throw new UnexpectedValueException('Token issued by an unknown API key');
        }

        return $claims;
    }
}

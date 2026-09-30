<?php

namespace App\Http\RequestSigning;

use Illuminate\Contracts\Cache\Repository;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

// Khoá phiên sống trong cache có hạn, không bao giờ nằm trong bundle JS. Đăng nhập/đăng xuất
// tăng "thế hệ" của subject: mọi khoá cấp trước đó hết hiệu lực ngay, client tự xin khoá mới.
final class SigningKeyStore
{
    private const KEY_BYTES = 32;

    private const PREFIX = 'request-signing:';

    public function issue(string $subject): SigningKey
    {
        $ttl = $this->keyTtl();
        $key = new SigningKey(
            id: Str::random(32),
            subject: $subject,
            generation: $this->generation($subject),
            encryptionKey: random_bytes(self::KEY_BYTES),
            signingKey: random_bytes(self::KEY_BYTES),
            expiresAt: now()->getTimestamp() + $ttl,
        );

        $this->cache()->put(self::PREFIX.'key:'.$key->id, $key->toStorage(), $ttl);

        return $key;
    }

    public function find(string $keyId): ?SigningKey
    {
        $stored = $this->cache()->get(self::PREFIX.'key:'.$keyId);

        if (! is_array($stored)) {
            return null;
        }

        $key = SigningKey::fromStorage($keyId, $stored);

        return $key->generation === $this->generation($key->subject) ? $key : null;
    }

    public function revokeSubject(string $subject): void
    {
        $this->cache()->increment(self::PREFIX.'generation:'.$subject);
    }

    // Nonce chỉ cần sống bằng cửa sổ lệch giờ ở cả hai phía: quá cửa sổ thì dấu thời gian đã chặn.
    public function claimNonce(string $keyId, string $nonce): bool
    {
        return $this->cache()->add(
            self::PREFIX.'nonce:'.$keyId.':'.$nonce,
            true,
            2 * (int) config('request_protection.signing.max_clock_skew_seconds'),
        );
    }

    private function generation(string $subject): int
    {
        return (int) $this->cache()->get(self::PREFIX.'generation:'.$subject, 0);
    }

    private function keyTtl(): int
    {
        return (int) config('request_protection.signing.key_ttl_seconds');
    }

    private function cache(): Repository
    {
        return Cache::store(config('request_protection.signing.cache_store'));
    }
}

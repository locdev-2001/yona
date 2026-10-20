<?php

namespace App\Services\Calls;

// Định danh một người trong phòng media: `user:{id}` cho người dùng Yona, `guest:{key}` cho
// khách không tài khoản. Lõi tự dựng và tự đọc, mọi nhà cung cấp chỉ chuyển nguyên chuỗi.
final readonly class ParticipantIdentity
{
    private const USER = 'user';

    private const GUEST = 'guest';

    private const GUEST_KEY_PATTERN = '/^[A-Za-z0-9_-]{8,64}$/';

    private function __construct(
        private string $kind,
        private string $key,
    ) {}

    public static function forUser(int $userId): self
    {
        return new self(self::USER, (string) $userId);
    }

    public static function forGuest(string $key): self
    {
        if (preg_match(self::GUEST_KEY_PATTERN, $key) !== 1) {
            throw new \InvalidArgumentException('Guest key must be 8-64 URL-safe characters');
        }

        return new self(self::GUEST, $key);
    }

    public static function parse(?string $identity): ?self
    {
        [$kind, $key] = explode(':', (string) $identity, 2) + [null, null];

        return match (true) {
            $kind === self::USER && ctype_digit((string) $key) => self::forUser((int) $key),
            $kind === self::GUEST && preg_match(self::GUEST_KEY_PATTERN, (string) $key) === 1 => self::forGuest($key),
            default => null,
        };
    }

    public function userId(): ?int
    {
        return $this->kind === self::USER ? (int) $this->key : null;
    }

    public function isGuest(): bool
    {
        return $this->kind === self::GUEST;
    }

    public function toString(): string
    {
        return $this->kind.':'.$this->key;
    }
}

<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

/**
 * Link mời mang một token ngẫu nhiên chỉ lưu bản băm (`token_digest`), có thể thu hồi
 * (`revoked_at`), hết hạn (`expires_at`, NULL = không hạn) và giới hạn lượt dùng
 * (`max_uses`, `use_count`).
 */
trait InviteToken
{
    public static function generateToken(): string
    {
        return Str::random(40);
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    public static function findByToken(string $token): ?self
    {
        return self::query()->where('token_digest', self::hashToken($token))->first();
    }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isExhausted(): bool
    {
        return $this->max_uses !== null && $this->use_count >= $this->max_uses;
    }

    public function isUsable(): bool
    {
        return ! $this->isRevoked() && ! $this->isExpired() && ! $this->isExhausted();
    }

    /** @return 'active'|'revoked'|'expired'|'exhausted' */
    public function status(): string
    {
        return match (true) {
            $this->isRevoked() => 'revoked',
            $this->isExpired() => 'expired',
            $this->isExhausted() => 'exhausted',
            default => 'active',
        };
    }
}

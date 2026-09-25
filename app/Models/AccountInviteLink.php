<?php

namespace App\Models;

use Database\Factories\AccountInviteLinkFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class AccountInviteLink extends Model
{
    /** @use HasFactory<AccountInviteLinkFactory> */
    use HasFactory;

    public const EXPIRY_DAY_CHOICES = [1, 7, 30];

    protected $fillable = [
        'account_id',
        'created_by_id',
        'role',
        'token_digest',
        'expires_at',
        'max_uses',
        'use_count',
        'revoked_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    /** @return array{0: self, 1: string} */
    public static function issue(Account $account, User $creator, int $role, int $expiresInDays, ?int $maxUses): array
    {
        $token = self::generateToken();

        $link = self::create([
            'account_id' => $account->id,
            'created_by_id' => $creator->id,
            'role' => $role,
            'token_digest' => self::hashToken($token),
            'expires_at' => now()->addDays($expiresInDays),
            'max_uses' => $maxUses,
            'use_count' => 0,
        ]);

        return [$link, $token];
    }

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

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
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

    public function roleName(): string
    {
        return AccountUser::roleNameFor($this->role);
    }
}

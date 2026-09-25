<?php

namespace App\Models;

use Database\Factories\AccountInviteLinkFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

// Link mời tự phục vụ (chủ tài khoản gửi tay qua Zalo), thay thế cho lời mời
// gõ từng email của AgentBuilder khi cần mời nhanh nhiều người cùng lúc.
class AccountInviteLink extends Model
{
    /** @use HasFactory<AccountInviteLinkFactory> */
    use HasFactory;

    // Lựa chọn hạn dùng hiện ở form tạo link — chỉ 3 mốc này, không cho nhập tự do.
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

    // Token thật chỉ tồn tại lúc tạo (trả về API) và trên URL người dùng nhận
    // được — DB chỉ giữ digest, giống nguyên tắc không lưu bí mật dạng plain.
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

    public function joins(): HasMany
    {
        return $this->hasMany(AccountUser::class, 'invite_link_id');
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
        return AccountUser::ROLE_NAMES[$this->role] ?? 'agent';
    }

    public function usesLeft(): ?int
    {
        return $this->max_uses === null ? null : max(0, $this->max_uses - $this->use_count);
    }
}

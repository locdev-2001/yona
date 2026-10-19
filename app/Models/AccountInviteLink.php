<?php

namespace App\Models;

use App\Models\Concerns\InviteToken;
use Database\Factories\AccountInviteLinkFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountInviteLink extends Model
{
    /** @use HasFactory<AccountInviteLinkFactory> */
    use HasFactory, InviteToken;

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

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function roleName(): string
    {
        return AccountUser::roleNameFor($this->role);
    }
}

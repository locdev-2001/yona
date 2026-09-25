<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Một lần super admin "đăng nhập hộ" người dùng từ console — xem
// docs/deployment.md mục 2FA & console quản trị. token_hash tra ngược token
// SSO một lần dùng thật sự tiêu thụ ở Auth\SessionsController::authenticateWithSsoToken.
class SuperAdminImpersonation extends Model
{
    protected $fillable = [
        'super_admin_id',
        'target_user_id',
        'account_id',
        'reason',
        'ip_address',
        'user_agent',
        'token_hash',
        'used_at',
    ];

    protected $casts = [
        'used_at' => 'datetime',
    ];

    public function superAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'super_admin_id');
    }

    public function targetUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public static function markUsedByTokenHash(string $tokenHash): void
    {
        static::query()
            ->where('token_hash', $tokenHash)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);
    }
}

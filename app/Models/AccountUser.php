<?php

namespace App\Models;

use Database\Factories\AccountUserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountUser extends Model
{
    /** @use HasFactory<AccountUserFactory> */
    use HasFactory;

    public const ROLE_AGENT = 0;

    public const ROLE_ADMINISTRATOR = 1;

    protected $fillable = [
        'account_id',
        'user_id',
        'role',
        'inviter_id',
        'availability',
        'auto_offline',
        'active_at',
    ];

    protected function casts(): array
    {
        return [
            'auto_offline' => 'boolean',
            'active_at' => 'datetime',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inviter_id');
    }

    public function isAdministrator(): bool
    {
        return $this->role === self::ROLE_ADMINISTRATOR;
    }

    public function roleName(): string
    {
        return $this->isAdministrator() ? 'administrator' : 'agent';
    }

    /** @return list<string> */
    public function permissions(): array
    {
        return [$this->roleName()];
    }
}

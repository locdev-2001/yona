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

    public const AVAILABILITY_ONLINE = 0;

    public const AVAILABILITY_OFFLINE = 1;

    public const AVAILABILITY_BUSY = 2;

    public const AVAILABILITY_NAMES = [
        self::AVAILABILITY_ONLINE => 'online',
        self::AVAILABILITY_OFFLINE => 'offline',
        self::AVAILABILITY_BUSY => 'busy',
    ];

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

    public function availabilityName(): string
    {
        return self::AVAILABILITY_NAMES[$this->availability] ?? 'online';
    }

    /** @return list<string> */
    public function permissions(): array
    {
        return [$this->roleName()];
    }
}

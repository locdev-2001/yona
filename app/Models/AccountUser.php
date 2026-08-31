<?php

namespace App\Models;

use App\Models\Concerns\AvailabilityStatusable;
use Database\Factories\AccountUserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountUser extends Model
{
    /** @use HasFactory<AccountUserFactory> */
    use AvailabilityStatusable, HasFactory;

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

    public const ROLE_NAMES = [
        self::ROLE_AGENT => 'agent',
        self::ROLE_ADMINISTRATOR => 'administrator',
    ];

    // Enum Rails nhận cả tên lẫn số — API Chatwoot gửi tên ('agent'/'online').
    public static function roleFromName(string $name): int
    {
        return array_flip(self::ROLE_NAMES)[$name] ?? self::ROLE_AGENT;
    }

    public static function availabilityFromName(string $name): int
    {
        return array_flip(self::AVAILABILITY_NAMES)[$name] ?? self::AVAILABILITY_ONLINE;
    }

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

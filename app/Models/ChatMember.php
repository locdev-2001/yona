<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Một người trong một hội thoại, kèm trạng thái riêng của người đó.
class ChatMember extends Model
{
    public const ROLE_MEMBER = 1;

    public const ROLE_ADMIN = 2;

    public const ROLE_OWNER = 3;

    public const ROLE_NAMES = [
        self::ROLE_MEMBER => 'member',
        self::ROLE_ADMIN => 'admin',
        self::ROLE_OWNER => 'owner',
    ];

    public const STATUS_ACTIVE = 1;

    // Tin từ người lạ: nằm ở hộp tin chờ tới khi người nhận trả lời hoặc chấp nhận.
    public const STATUS_PENDING = 2;

    public const STATUS_LEFT = 3;

    public const STATUS_REMOVED = 4;

    protected $table = 'conversation_members';

    protected $fillable = [
        'conversation_id',
        'user_id',
        'role',
        'status',
        'last_read_message_id',
        'muted_until',
        'archived_at',
        'pinned_at',
        'joined_at',
        'invited_by',
    ];

    protected function casts(): array
    {
        return [
            'muted_until' => 'datetime',
            'archived_at' => 'datetime',
            'pinned_at' => 'datetime',
            'joined_at' => 'datetime',
        ];
    }

    public function chat(): BelongsTo
    {
        return $this->belongsTo(Chat::class, 'conversation_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isOwner(): bool
    {
        return $this->role === self::ROLE_OWNER;
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function roleName(): string
    {
        return self::ROLE_NAMES[$this->role] ?? 'member';
    }

    public function isMuted(): bool
    {
        return $this->muted_until !== null && $this->muted_until->isFuture();
    }
}

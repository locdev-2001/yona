<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Một người trong nhóm. `conversation_id` là dòng của nhóm trong hộp thư Yona của chính
// người đó; rời nhóm thì giữ dòng với `left_at` để xem lại lịch sử tới mốc đó.
class YonaGroupMember extends Model
{
    public const ROLE_ADMIN = 'admin';

    public const ROLE_MEMBER = 'member';

    public const JOINED_AS_CREATOR = 'creator';

    public const JOINED_BY_ADD = 'added';

    public const JOINED_BY_INVITE_LINK = 'invite_link';

    protected $fillable = ['yona_group_id', 'user_id', 'conversation_id', 'role', 'joined_via', 'added_by_id', 'yona_group_invite_link_id', 'left_at'];

    protected function casts(): array
    {
        return [
            'left_at' => 'datetime',
        ];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(YonaGroup::class, 'yona_group_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isActive(): bool
    {
        return $this->left_at === null;
    }
}

<?php

namespace App\Services\Chat;

use App\Models\User;
use App\Models\UserBlock;

// Chặn người dùng. Chặn theo một chiều nhưng có hiệu lực hai chiều với hội thoại
// 1-1: không bên nào gửi được cho bên kia.
class UserBlocks
{
    public function block(User $blocker, User $blocked): void
    {
        if ($blocker->is($blocked)) {
            return;
        }

        UserBlock::query()->firstOrCreate(['blocker_id' => $blocker->getKey(), 'blocked_id' => $blocked->getKey()]);
    }

    public function unblock(User $blocker, User $blocked): void
    {
        UserBlock::query()->where(['blocker_id' => $blocker->getKey(), 'blocked_id' => $blocked->getKey()])->delete();
    }

    public function hasBlocked(User $blocker, User $blocked): bool
    {
        return UserBlock::query()->where(['blocker_id' => $blocker->getKey(), 'blocked_id' => $blocked->getKey()])->exists();
    }

    public function isBlockedBetween(User $first, User $second): bool
    {
        return UserBlock::query()
            ->where(fn ($pair) => $pair->where(['blocker_id' => $first->getKey(), 'blocked_id' => $second->getKey()]))
            ->orWhere(fn ($pair) => $pair->where(['blocker_id' => $second->getKey(), 'blocked_id' => $first->getKey()]))
            ->exists();
    }
}

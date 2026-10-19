<?php

namespace App\Services\Groups;

use App\Exceptions\GroupActionRejected;
use App\Models\Message;
use App\Models\User;
use App\Models\YonaGroup;
use App\Models\YonaGroupMember;

// Ai được làm gì trong nhóm, đặt ở một chỗ: controller và service chỉ gọi vào đây.
final class GroupPermissions
{
    public function activeMember(YonaGroup $group, User $user): YonaGroupMember
    {
        return $group->activeMemberFor($user) ?? throw GroupActionRejected::forbidden('NOT_A_MEMBER');
    }

    public function admin(YonaGroup $group, User $user): YonaGroupMember
    {
        $member = $this->activeMember($group, $user);

        if (! $member->isAdmin()) {
            throw GroupActionRejected::forbidden('NOT_ADMIN');
        }

        return $member;
    }

    // Tin chung của nhóm: người gửi thu hồi tin của mình, quản trị thu hồi được mọi tin.
    public function mayRemoveMessage(YonaGroup $group, User $user, Message $message): bool
    {
        $member = $group->activeMemberFor($user);

        if ($member === null) {
            return false;
        }

        return $member->isAdmin()
            || ($message->sender_type === $user->getMorphClass() && (int) $message->sender_id === $user->id);
    }
}

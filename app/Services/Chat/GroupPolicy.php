<?php

namespace App\Services\Chat;

use App\Exceptions\Chat\ChatActionRefused;
use App\Models\ChatMember;

// Quyền trong nhóm, đặt một chỗ. Trưởng nhóm làm được mọi việc; phó nhóm đổi tên,
// đổi ảnh, thêm và xoá thành viên thường; thành viên thêm người và rời nhóm.
class GroupPolicy
{
    public const MAX_MEMBERS = 500;

    public const MIN_INVITEES = 2;

    public function canEditInfo(ChatMember $actor): bool
    {
        return $actor->isOwner() || $actor->isAdmin();
    }

    public function canAddMembers(ChatMember $actor): bool
    {
        return $actor->isActive();
    }

    public function canRemove(ChatMember $actor, ChatMember $target): bool
    {
        if ($actor->is($target) || $target->isOwner()) {
            return false;
        }

        return $actor->isOwner() || ($actor->isAdmin() && ! $target->isAdmin());
    }

    public function canChangeRole(ChatMember $actor, ChatMember $target): bool
    {
        return $actor->isOwner() && ! $actor->is($target);
    }

    public function canManageInviteLink(ChatMember $actor): bool
    {
        return $this->canEditInfo($actor);
    }

    public function canDissolve(ChatMember $actor): bool
    {
        return $actor->isOwner();
    }

    /** @return array<string, bool> */
    public function abilities(ChatMember $actor): array
    {
        return [
            'edit_info' => $this->canEditInfo($actor),
            'add_members' => $this->canAddMembers($actor),
            'manage_invite_link' => $this->canManageInviteLink($actor),
            'change_roles' => $actor->isOwner(),
            'remove_members' => $actor->isOwner() || $actor->isAdmin(),
            'dissolve' => $this->canDissolve($actor),
        ];
    }

    /** @throws ChatActionRefused */
    public function authorize(bool $allowed): void
    {
        if (! $allowed) {
            throw ChatActionRefused::notAllowed();
        }
    }

    /** @throws ChatActionRefused */
    public function ensureCapacity(int $currentCount, int $adding): void
    {
        if ($currentCount + $adding > self::MAX_MEMBERS) {
            throw ChatActionRefused::groupFull(self::MAX_MEMBERS);
        }
    }
}

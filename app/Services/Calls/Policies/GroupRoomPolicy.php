<?php

namespace App\Services\Calls\Policies;

use App\Models\Call;
use App\Models\User;
use App\Services\Calls\Media\ParticipantPermissions;
use App\Services\Groups\GroupPermissions;

// Phòng thoại nhóm luôn mở: thành viên nào cũng vào, phát mic/camera/màn hình; quản trị
// nhóm tắt mic hoặc đưa người ra.
final readonly class GroupRoomPolicy implements CallPolicy
{
    public const MAX_PARTICIPANTS = 25;

    public function __construct(private GroupPermissions $groupPermissions) {}

    public function maxParticipants(): int
    {
        return self::MAX_PARTICIPANTS;
    }

    public function authorizeJoin(Call $call, User $user): void
    {
        $this->groupPermissions->activeMember($call->group, $user);
    }

    public function permissionsFor(Call $call, User $user): ParticipantPermissions
    {
        return ParticipantPermissions::allSources();
    }

    public function mayModerate(Call $call, User $actor): bool
    {
        return $call->group->activeMemberFor($actor)?->isAdmin() ?? false;
    }
}

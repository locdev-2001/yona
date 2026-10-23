<?php

namespace App\Services\Groups\Calls;

use App\Exceptions\CallActionRejected;
use App\Models\Call;
use App\Models\User;
use App\Services\Calls\Admission;
use App\Services\Calls\CallAttendee;
use App\Services\Calls\Kinds\CallPolicy;
use App\Services\Calls\Media\ParticipantPermissions;
use App\Services\Groups\GroupPermissions;

// Cuộc gọi nhóm có đổ chuông: thành viên nào cũng gọi và vào được, phát được thoại, camera và màn
// hình, tối đa 50 người cùng lúc; quản trị nhóm tắt mic hoặc đưa người ra.
final readonly class GroupCallPolicy implements CallPolicy
{
    public const KIND = 'group_call';

    public const MAX_PARTICIPANTS = 50;

    public function __construct(private GroupPermissions $groupPermissions) {}

    public function maxParticipants(): int
    {
        return self::MAX_PARTICIPANTS;
    }

    public function admit(Call $call, CallAttendee $attendee): Admission
    {
        if ($attendee->user === null) {
            throw CallActionRejected::forbidden('NOT_A_PARTICIPANT');
        }

        $this->groupPermissions->activeMember($call->group, $attendee->user);

        return Admission::granted(ParticipantPermissions::allSources());
    }

    public function mayModerate(Call $call, User $actor): bool
    {
        return $call->group->activeMemberFor($actor)?->isAdmin() ?? false;
    }

    public function mayReportTelemetry(Call $call, User $actor): bool
    {
        return $call->group->activeMemberFor($actor) !== null;
    }
}

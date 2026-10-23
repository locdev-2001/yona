<?php

namespace App\Services\Groups\Calls;

use App\Exceptions\CallActionRejected;
use App\Models\Call;
use App\Models\User;
use App\Services\Calls\Admission;
use App\Services\Calls\CallAttendee;
use App\Services\Calls\Kinds\CallPolicy;
use App\Services\Calls\Media\MediaSource;
use App\Services\Calls\Media\ParticipantPermissions;
use App\Services\Groups\GroupPermissions;

// Phòng thoại nhóm luôn mở: thành viên nhóm vào thẳng, không phòng chờ, phát tiếng và chia sẻ
// màn hình nhưng không camera (gọi video là cuộc gọi nhóm có chuông, loại khác); quản trị nhóm tắt
// mic hoặc đưa người ra. Khách không tài khoản không vào được.
final readonly class GroupRoomPolicy implements CallPolicy
{
    public const KIND = 'group_room';

    public const MAX_PARTICIPANTS = 25;

    private const PUBLISHABLE_SOURCES = [MediaSource::Microphone, MediaSource::Screen, MediaSource::ScreenAudio];

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

        return Admission::granted(new ParticipantPermissions(self::PUBLISHABLE_SOURCES));
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

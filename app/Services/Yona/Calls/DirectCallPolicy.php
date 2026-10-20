<?php

namespace App\Services\Yona\Calls;

use App\Exceptions\CallActionRejected;
use App\Models\Call;
use App\Models\User;
use App\Services\Calls\Admission;
use App\Services\Calls\CallAttendee;
use App\Services\Calls\CallStatus;
use App\Services\Calls\Kinds\CallPolicy;
use App\Services\Calls\Media\ParticipantPermissions;

// Gọi 1-1 giữa hai người dùng Yona: chỉ người gọi và người nhận vào được phòng. Người gọi vào
// ngay lúc đổ chuông để media sẵn sàng; người nhận chỉ vào sau khi đã nghe máy. Không ai điều hành.
final readonly class DirectCallPolicy implements CallPolicy
{
    public const KIND = 'direct';

    public function maxParticipants(): int
    {
        return 2;
    }

    public function admit(Call $call, CallAttendee $attendee): Admission
    {
        $userId = $attendee->user?->id;
        $isCaller = $userId !== null && $userId === $call->caller_id;
        $isAnsweredCallee = $userId !== null && $userId === $call->callee_id && $call->status === CallStatus::Active;

        if (! $isCaller && ! $isAnsweredCallee) {
            throw CallActionRejected::forbidden('NOT_A_PARTICIPANT');
        }

        return Admission::granted(ParticipantPermissions::allSources());
    }

    public function mayModerate(Call $call, User $actor): bool
    {
        return false;
    }
}

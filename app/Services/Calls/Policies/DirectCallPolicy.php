<?php

namespace App\Services\Calls\Policies;

use App\Exceptions\CallActionRejected;
use App\Models\Call;
use App\Models\User;
use App\Services\Calls\Media\ParticipantPermissions;

// Gọi 1-1: chỉ người gọi và người nhận vào phòng, đổi qua lại thoại/video bằng quyền phát
// sẵn có; không ai điều hành ai.
final readonly class DirectCallPolicy implements CallPolicy
{
    private const MAX_PARTICIPANTS = 2;

    public function maxParticipants(): int
    {
        return self::MAX_PARTICIPANTS;
    }

    public function authorizeJoin(Call $call, User $user): void
    {
        if (! in_array($user->id, [(int) $call->caller_id, (int) $call->callee_id], true)) {
            throw CallActionRejected::forbidden('NOT_A_PARTICIPANT');
        }
    }

    public function permissionsFor(Call $call, User $user): ParticipantPermissions
    {
        return ParticipantPermissions::allSources();
    }

    public function mayModerate(Call $call, User $actor): bool
    {
        return false;
    }
}

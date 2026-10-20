<?php

namespace App\Services\Calls\Policies;

use App\Models\Call;
use App\Models\User;
use App\Services\Calls\Media\ParticipantPermissions;

// Luật của một loại cuộc gọi: ai vào được, vào thì được phát gì, ai điều hành được, phòng
// chứa tối đa bao nhiêu người. Thêm loại cuộc gọi = thêm một chính sách.
interface CallPolicy
{
    public function maxParticipants(): int;

    public function authorizeJoin(Call $call, User $user): void;

    public function permissionsFor(Call $call, User $user): ParticipantPermissions;

    public function mayModerate(Call $call, User $actor): bool;
}

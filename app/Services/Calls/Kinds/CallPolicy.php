<?php

namespace App\Services\Calls\Kinds;

use App\Models\Call;
use App\Models\User;
use App\Services\Calls\Admission;
use App\Services\Calls\CallAttendee;

// Luật của một loại cuộc gọi, do module dùng lõi (nhóm, 1-1, meeting) cung cấp: ai vào được
// và vào thì được phát gì hay phải chờ duyệt, phòng chứa tối đa bao nhiêu người, ai điều hành.
interface CallPolicy
{
    public function maxParticipants(): int;

    public function admit(Call $call, CallAttendee $attendee): Admission;

    public function mayModerate(Call $call, User $actor): bool;

    public function mayReportTelemetry(Call $call, User $actor): bool;
}

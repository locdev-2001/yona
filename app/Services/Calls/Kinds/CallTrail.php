<?php

namespace App\Services\Calls\Kinds;

use App\Models\Call;

// Dấu vết một loại cuộc gọi để lại khi đời phòng đổi (tin hệ thống trong hội thoại, lịch sử
// cuộc họp…). Lõi gọi sau khi đã ghi xong sự kiện phòng; loại nào không cần thì không khai.
interface CallTrail
{
    public function roomStarted(Call $call): void;

    public function roomFinished(Call $call): void;
}

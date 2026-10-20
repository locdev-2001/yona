<?php

namespace App\Services\Calls;

use App\Services\Calls\Media\ParticipantPermissions;

// Kết quả bước cấp phép của chính sách: được vào kèm quyền phát, hoặc phải chờ người có
// quyền duyệt (phòng chờ). Bị từ chối thì chính sách ném CallActionRejected/lỗi của module.
final readonly class Admission
{
    private function __construct(public ?ParticipantPermissions $permissions) {}

    public static function granted(ParticipantPermissions $permissions): self
    {
        return new self($permissions);
    }

    public static function awaitingApproval(): self
    {
        return new self(null);
    }

    public function isGranted(): bool
    {
        return $this->permissions !== null;
    }
}

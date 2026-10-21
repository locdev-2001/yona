<?php

namespace App\Services\Calls;

use App\Models\Call;
use App\Services\Calls\Media\JoinTicket;
use App\Services\Calls\Media\ParticipantPermissions;

// Kết quả xin vào phòng: có vé thì kết nối ngay (kèm quyền phát để giao diện chỉ hiện nút được
// dùng), không có vé là đang chờ duyệt.
final readonly class CallJoin
{
    public function __construct(
        public Call $call,
        public ?JoinTicket $ticket,
        public ?ParticipantPermissions $permissions = null,
    ) {}

    public function isAwaitingApproval(): bool
    {
        return $this->ticket === null;
    }
}

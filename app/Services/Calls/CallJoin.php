<?php

namespace App\Services\Calls;

use App\Models\Call;
use App\Services\Calls\Media\JoinTicket;

// Kết quả xin vào phòng: có vé thì kết nối ngay, không có vé là đang chờ duyệt.
final readonly class CallJoin
{
    public function __construct(
        public Call $call,
        public ?JoinTicket $ticket,
    ) {}

    public function isAwaitingApproval(): bool
    {
        return $this->ticket === null;
    }
}

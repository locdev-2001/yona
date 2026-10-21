<?php

namespace App\Services\Groups\Calls;

use App\Models\Call;
use App\Services\Calls\Kinds\CallPresenceObserver;

// Người vào/ra cuộc gọi nhóm: chốt lại trạng thái cuộc gọi (người gọi bỏ đi khi còn đổ chuông là
// huỷ, người cuối cùng rời là kết thúc) và báo thành viên ai đang ở trong cuộc gọi.
final readonly class GroupCallPresence implements CallPresenceObserver
{
    public function __construct(private GroupCalls $groupCalls) {}

    public function presenceChanged(Call $call): void
    {
        $this->groupCalls->settleAfterPresenceChange($call);
    }
}

<?php

namespace App\Services\Yona\Calls;

use App\Models\Call;
use App\Services\Calls\Kinds\CallPresenceObserver;

// Người trong phòng 1-1 đổi: người gọi rời khi còn đổ chuông là huỷ, một người rời sau khi
// đã nghe máy là kết thúc cho cả hai.
final readonly class DirectCallPresence implements CallPresenceObserver
{
    public function __construct(private DirectCalls $directCalls) {}

    public function presenceChanged(Call $call): void
    {
        $this->directCalls->settleAfterPresenceChange($call);
    }
}

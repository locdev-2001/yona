<?php

namespace App\Jobs\Calls;

use App\Jobs\ApplicationJob;
use App\Services\Groups\Calls\GroupCalls;

// Hết giờ đổ chuông của một cuộc gọi nhóm: ai chưa nghe thì nhỡ; chưa ai nghe thì cả cuộc nhỡ.
class ExpireGroupCallJob extends ApplicationJob
{
    public function __construct(public readonly int $callId)
    {
        $this->onQueue('critical');
    }

    public function handle(GroupCalls $groupCalls): void
    {
        $groupCalls->expire($this->callId);
    }
}

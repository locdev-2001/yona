<?php

namespace App\Jobs\Calls;

use App\Jobs\ApplicationJob;
use App\Services\Yona\Calls\DirectCalls;

// Hết giờ đổ chuông của một cuộc gọi 1-1: còn đổ chuông thì thành cuộc gọi nhỡ. Cuộc đã nghe,
// đã từ chối hay đã huỷ thì bỏ qua.
class ExpireDirectCallJob extends ApplicationJob
{
    public function __construct(public readonly int $callId)
    {
        $this->onQueue('critical');
    }

    public function handle(DirectCalls $directCalls): void
    {
        $directCalls->expire($this->callId);
    }
}

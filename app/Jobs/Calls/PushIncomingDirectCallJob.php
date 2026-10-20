<?php

namespace App\Jobs\Calls;

use App\Jobs\ApplicationJob;
use App\Models\Call;
use App\Services\Yona\Calls\DirectCallSignals;

// Web Push "có người gọi" tới các trình duyệt của người nhận, ngoài luồng yêu cầu bấm gọi.
class PushIncomingDirectCallJob extends ApplicationJob
{
    public function __construct(public readonly int $callId)
    {
        $this->onQueue('critical');
    }

    public function handle(DirectCallSignals $signals): void
    {
        $call = Call::query()->find($this->callId);

        if ($call !== null) {
            $signals->ringByPush($call);
        }
    }
}

<?php

namespace App\Jobs\Webhooks;

use App\Jobs\ApplicationJob;
use App\Services\MessengerPersonal\BridgeEventService;

// Cùng khuôn với các job webhook kênh ngoài: controller chỉ nhận và đẩy vào hàng đợi.
class MessengerPersonalEventsJob extends ApplicationJob
{
    /** @param array<string, mixed> $params */
    public function __construct(public readonly array $params) {}

    public function handle(BridgeEventService $events): void
    {
        $events->handle($this->params);
    }
}

<?php

namespace App\Jobs\Webhooks;

use App\Jobs\ApplicationJob;
use App\Services\Zalo\BridgeEventService;

// Cùng khuôn với các job webhook kênh ngoài F2–F5: controller chỉ nhận và đẩy
// vào hàng đợi, xử lý nằm ở service.
class ZaloEventsJob extends ApplicationJob
{
    /** @param array<string, mixed> $params */
    public function __construct(public readonly array $params) {}

    public function handle(BridgeEventService $events): void
    {
        $events->handle($this->params);
    }
}

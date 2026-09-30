<?php

namespace App\Jobs\Conversations;

use App\Jobs\ApplicationJob;
use App\Messaging\Delivery\OutboundOrder;

// Gỡ hàng gửi của hội thoại khi job của tin đầu hàng đã mất (worker chết, job rơi).
class SweepOutboundOrderJob extends ApplicationJob
{
    public function __construct()
    {
        $this->onQueue('scheduled_jobs');
    }

    public function handle(OutboundOrder $order): void
    {
        $order->sweep();
    }
}

<?php

namespace App\Listeners\Alerts;

use App\Support\Alerts\OpsAlerter;
use Laravel\Horizon\Events\LongWaitDetected;

/**
 * Hàng đợi ứ job nghĩa là worker chết hoặc quá tải — hai trường hợp đều làm
 * tin nhắn khách trễ. Ngưỡng đặt ở config/horizon.php (`waits`), gồm cả
 * `redis:critical` (thiếu trước khi có cảnh báo này, xem docs/deployment.md
 * mục 8).
 */
class AlertOnLongWaitDetected
{
    public function __construct(private readonly OpsAlerter $alerter) {}

    public function handle(LongWaitDetected $event): void
    {
        $signature = "horizon-long-wait:{$event->connection}:{$event->queue}";

        $this->alerter->send($signature, sprintf(
            'Hàng đợi chờ quá lâu: %s (connection %s) đã chờ %ss.',
            $event->queue,
            $event->connection,
            $event->seconds,
        ));
    }
}

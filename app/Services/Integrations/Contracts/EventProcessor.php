<?php

namespace App\Services\Integrations\Contracts;

use App\Models\Integrations\Hook;

// Hợp đồng trung tính giữa lõi (HookListener/HookJob) và từng ứng dụng tích hợp.
// Thay cho bảng INTEGRATION_PROCESSORS hardcode trong hook_job.rb và
// supported_events_map hardcode trong hook_listener.rb của Chatwoot: mỗi app khai
// `event_processor` trong config/integration/apps.php, lõi không biết tên app nào.
interface EventProcessor
{
    /** @return list<string> Tên sự kiện (EventType->value) mà app này nhận. */
    public function supportedEvents(): array;

    /** @param array<string, mixed> $eventData Dữ liệu kèm sự kiện (message/contact/conversation…). */
    public function process(Hook $hook, string $eventName, array $eventData): void;
}

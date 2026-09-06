<?php

namespace App\Services\Integrations\Dialogflow;

use App\Models\Integrations\Hook;
use App\Services\Integrations\Contracts\EventProcessor as EventProcessorContract;

// Cổng nối HookJob/HookListener (App\Services\Integrations\Contracts\EventProcessor,
// resolve qua container không tham số) vào ProcessorService (cần hook/eventName/
// eventData mỗi lần chạy — pattr_initialize của bản gốc). Khai ở
// config/integration/apps.php khoá `dialogflow.event_processor`.
class EventProcessor implements EventProcessorContract
{
    public function supportedEvents(): array
    {
        return ['message.created', 'message.updated'];
    }

    public function process(Hook $hook, string $eventName, array $eventData): void
    {
        (new ProcessorService($eventName, $hook, $eventData))->perform();
    }
}

<?php

namespace App\Services\Integrations\GoogleTranslate;

use App\Models\Integrations\Hook;
use App\Models\Message;
use App\Services\Integrations\Contracts\EventProcessor as EventProcessorContract;

// Cổng nối HookJob/HookListener vào DetectLanguageService — khai ở
// config/integration/apps.php khoá `google_translate.event_processor`.
class EventProcessor implements EventProcessorContract
{
    public function supportedEvents(): array
    {
        return ['message.created'];
    }

    public function process(Hook $hook, string $eventName, array $eventData): void
    {
        $message = $eventData['message'] ?? null;

        if (! $message instanceof Message) {
            return;
        }

        (new DetectLanguageService($hook, $message))->perform();
    }
}

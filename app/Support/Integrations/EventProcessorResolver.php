<?php

namespace App\Support\Integrations;

use App\Models\Integrations\Hook;
use App\Services\Integrations\Contracts\EventProcessor;

// Nơi duy nhất tra driver xử lý sự kiện của một hook — listener và job cùng dùng.
final class EventProcessorResolver
{
    public static function forHook(Hook $hook): ?EventProcessor
    {
        $processorClass = $hook->app()?->params['event_processor'] ?? null;

        if ($processorClass === null) {
            return null;
        }

        $processor = app($processorClass);

        return $processor instanceof EventProcessor ? $processor : null;
    }
}

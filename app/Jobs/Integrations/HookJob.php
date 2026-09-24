<?php

namespace App\Jobs\Integrations;

use App\Jobs\ApplicationJob;
use App\Models\Integrations\Hook;
use App\Support\Integrations\EventProcessorResolver;
use Illuminate\Support\Facades\Log;
use Throwable;

// Nhận sự kiện của một hook rồi
// giao cho driver của app xử lý. Lỗi của driver chỉ ghi log, không làm job hỏng
// (rescue StandardError của bản gốc).
class HookJob extends ApplicationJob
{
    /** @param array<string, mixed> $eventData */
    public function __construct(
        public readonly Hook $hook,
        public readonly string $eventName,
        public readonly array $eventData = [],
    ) {
        $this->onQueue('medium');
    }

    public function handle(): void
    {
        if ($this->hook->isDisabled()) {
            return;
        }

        $processor = EventProcessorResolver::forHook($this->hook);

        if ($processor === null) {
            return;
        }

        try {
            $processor->process($this->hook, $this->eventName, $this->eventData);
        } catch (Throwable $error) {
            Log::error($error->getMessage(), ['hook_id' => $this->hook->id, 'event' => $this->eventName]);
        }
    }
}

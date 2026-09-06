<?php

namespace App\Jobs\Integrations;

use App\Jobs\ApplicationJob;
use App\Models\Integrations\Hook;
use App\Models\Message;
use App\Services\Integrations\Slack\UpdateSlackMessageService;
use Illuminate\Support\Facades\Cache;

// Port từ refs/chatwoot/app/jobs/update_slack_message_job.rb — cùng khoá mutex
// với SendOnSlackJob (một kênh Slack chỉ xử lý một thao tác tại một thời điểm).
class UpdateSlackMessageJob extends ApplicationJob
{
    public int $tries = 8;

    private const LOCK_SECONDS = 10;

    public function __construct(
        public readonly Message $message,
        public readonly Hook $hook,
    ) {
        $this->onQueue('medium');
    }

    public function handle(): void
    {
        $lock = Cache::lock($this->lockKey(), self::LOCK_SECONDS);

        if (! $lock->get()) {
            $this->release(1);

            return;
        }

        try {
            (new UpdateSlackMessageService($this->message, $this->hook))->perform();
        } finally {
            $lock->release();
        }
    }

    private function lockKey(): string
    {
        return "SLACK_MESSAGE_MUTEX::{$this->message->conversation_id}::{$this->hook->reference_id}";
    }
}

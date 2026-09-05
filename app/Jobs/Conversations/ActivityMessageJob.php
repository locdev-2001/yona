<?php

namespace App\Jobs\Conversations;

use App\Jobs\ApplicationJob;
use App\Models\Conversation;

// Port từ refs/chatwoot/app/jobs/conversations/activity_message_job.rb.
class ActivityMessageJob extends ApplicationJob
{
    public function __construct(
        public readonly Conversation $conversation,
        public readonly array $messageParams,
    ) {
        $this->onQueue('high');
    }

    public function handle(): void
    {
        $this->conversation->messages()->create($this->messageParams);
    }
}

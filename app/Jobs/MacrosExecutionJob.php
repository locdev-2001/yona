<?php

namespace App\Jobs;

use App\Models\Macro;
use App\Models\User;
use App\Services\Macros\ExecutionService;

// Port từ refs/chatwoot/app/jobs/macros_execution_job.rb.
class MacrosExecutionJob extends ApplicationJob
{
    /** @param list<int|string> $conversationIds */
    public function __construct(
        private readonly Macro $macro,
        private readonly array $conversationIds,
        private readonly User $user,
    ) {
        $this->onQueue('medium');
    }

    public function handle(): void
    {
        $conversations = $this->macro->account
            ->conversations()
            ->whereIn('display_id', array_map('intval', $this->conversationIds))
            ->get();

        foreach ($conversations as $conversation) {
            (new ExecutionService($this->macro, $conversation, $this->user))->perform();
        }
    }
}

<?php

namespace App\Jobs\Contacts;

use App\Jobs\ApplicationJob;
use App\Models\Account;
use App\Models\User;
use App\Services\Contacts\BulkActionService;

// Port từ refs/chatwoot/app/jobs/contacts/bulk_action_job.rb.
class BulkActionJob extends ApplicationJob
{
    /** @param array<string, mixed> $params */
    public function __construct(
        public readonly Account $account,
        public readonly ?User $user,
        public readonly array $params,
    ) {
        $this->onQueue('medium');
    }

    public function handle(): void
    {
        (new BulkActionService($this->account, $this->user, $this->params))->perform();
    }
}

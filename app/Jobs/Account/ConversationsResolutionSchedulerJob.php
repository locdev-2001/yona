<?php

namespace App\Jobs\Account;

use App\Jobs\ApplicationJob;
use App\Jobs\Conversations\ResolutionJob;
use App\Models\Account;

// Chạy theo lịch, rải một ResolutionJob cho mỗi account có đặt auto_resolve_after.
class ConversationsResolutionSchedulerJob extends ApplicationJob
{
    public const BATCH_SIZE = 100;

    public function __construct()
    {
        $this->onQueue('scheduled_jobs');
    }

    public function handle(): void
    {
        Account::query()
            ->withAutoResolve()
            ->chunkById(self::BATCH_SIZE, function ($accounts) {
                $accounts->each(fn (Account $account) => ResolutionJob::dispatch($account));
            });
    }
}

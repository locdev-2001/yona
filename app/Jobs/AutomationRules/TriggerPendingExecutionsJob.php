<?php

namespace App\Jobs\AutomationRules;

use App\Jobs\ApplicationJob;
use App\Models\AutomationRulePendingExecution;

class TriggerPendingExecutionsJob extends ApplicationJob
{
    public const SWEEP_LIMIT = 1000;

    public function __construct()
    {
        $this->onQueue('scheduled_jobs');
    }

    public function handle(): void
    {
        AutomationRulePendingExecution::purgeTerminal();

        AutomationRulePendingExecution::query()
            ->sweepable()
            ->whereHas('account', fn ($query) => $query->whereRaw("COALESCE(feature_flags ->> 'delayed_automations', 'false') = 'true'"))
            ->orderBy('due_at')
            ->limit(self::SWEEP_LIMIT)
            ->get()
            ->each(fn (AutomationRulePendingExecution $row) => ProcessPendingExecutionJob::dispatch($row));
    }
}

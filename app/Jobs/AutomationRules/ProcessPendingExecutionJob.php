<?php

namespace App\Jobs\AutomationRules;

use App\Jobs\ApplicationJob;
use App\Models\AutomationRulePendingExecution;
use App\Services\AutomationRules\ActionService;
use App\Services\AutomationRules\ConditionsFilterService;
use Throwable;

class ProcessPendingExecutionJob extends ApplicationJob
{
    public function __construct(private readonly AutomationRulePendingExecution $pendingExecution) {}

    public function handle(): void
    {
        if (! $this->pendingExecution->account->featureEnabled('delayed_automations')
            || ! $this->pendingExecution->claim()) {
            return;
        }

        $reason = $this->skipReason();
        if ($reason !== null) {
            $this->pendingExecution->update(['status' => AutomationRulePendingExecution::STATUS_SKIPPED, 'skip_reason' => $reason]);

            return;
        }

        // Chốt executing trước action customer-facing: nếu process chết sau send
        // message thì sweep không được gửi lại lần hai.
        $this->pendingExecution->update(['status' => AutomationRulePendingExecution::STATUS_EXECUTING]);
        (new ActionService(
            $this->pendingExecution->automationRule,
            $this->pendingExecution->account,
            $this->pendingExecution->conversation,
        ))->perform();
        $this->pendingExecution->update(['status' => AutomationRulePendingExecution::STATUS_EXECUTED]);
    }

    private function skipReason(): ?string
    {
        if ($this->pendingExecution->due_at->lt(now()->subDays(AutomationRulePendingExecution::DUE_WINDOW_DAYS))) {
            return 'expired';
        }
        if (! $this->pendingExecution->automationRule?->active) {
            return 'rule_inactive';
        }
        if (! $this->pendingExecution->conversation) {
            return 'conversation_gone';
        }
        if (! $this->pendingExecution->episodeCurrent()) {
            return 'episode_moved';
        }
        if (! (new ConditionsFilterService(
            $this->pendingExecution->automationRule,
            $this->pendingExecution->conversation,
            ['message' => $this->pendingExecution->message],
        ))->perform()) {
            return 'conditions_changed';
        }

        return null;
    }

    public function failed(Throwable $exception): void
    {
        report($exception);
    }
}

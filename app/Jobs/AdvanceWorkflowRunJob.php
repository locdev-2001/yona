<?php

namespace App\Jobs;

use App\Models\WorkflowRun;
use App\Modules\Automation\WorkflowEngine;
use App\Support\TenantScope;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Dedup: ShouldBeUnique theo workflow_run_id — chặn 2 job advance cùng 1 run
 * (docs/crm-automation-workflow.md:76).
 *
 * Nhận workspaceId + workflowRunId dạng scalar, KHÔNG nhận WorkflowRun đã
 * hydrate qua constructor: RLS trên workflow_runs là FORCE + policy dựa vào
 * current_setting('app.current_workspace') — nếu truyền model đã hydrate,
 * Laravel's SerializesModels sẽ refetch nó lúc unserialize (trước khi
 * handle() kịp bind tenant scope), RLS sẽ chặn hết → property null. Bind
 * trước, fetch sau, trong handle().
 */
class AdvanceWorkflowRunJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public function __construct(
        public readonly string $workspaceId,
        public readonly string $workflowRunId,
    ) {}

    public function uniqueId(): string
    {
        return $this->workflowRunId;
    }

    public function handle(WorkflowEngine $engine): void
    {
        // runScoped() restores whatever context was active before (rather
        // than blindly clearing it) — required because a node handler
        // reached via advance() can itself trigger ANOTHER scoped job
        // synchronously before this one returns (e.g. ChangeLeadStageNodeHandler
        // → LeadService::moveStage() → LeadStageChanged event →
        // EnrollWorkflowsForLeadEventJob, all inline on the sync queue). A
        // plain bind()+forget() here would wipe THIS job's context the
        // moment that nested job finishes, breaking the very next
        // WorkflowRunLog write in the same advance() loop.
        TenantScope::runScoped($this->workspaceId, function () use ($engine) {
            $run = WorkflowRun::findOrFail($this->workflowRunId);

            $engine->advance($run);
        });
    }
}

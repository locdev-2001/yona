<?php

namespace App\Console\Commands;

use App\Jobs\AdvanceWorkflowRunJob;
use App\Models\WorkflowRun;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Cron entry-point: tìm workflow_runs đang waiting đã tới resume_at, dispatch
 * AdvanceWorkflowRunJob cho từng run. Scan cross-workspace qua connection
 * pgsql_privileged (bypass RLS) — mirror ReminderService::dispatchDue()'s
 * snapshot step. Job tự bind RLS context của riêng nó khi chạy.
 */
class ResumeWaitingWorkflowRuns extends Command
{
    protected $signature = 'workflow:resume-waiting';

    protected $description = 'Dispatch AdvanceWorkflowRunJob for workflow runs whose wait has elapsed.';

    public function handle(): int
    {
        $dispatched = $this->dispatchDue();

        $this->info("Dispatched {$dispatched} workflow run(s) to resume.");

        return self::SUCCESS;
    }

    /**
     * @param  list<array{id: string, workspace_id: string}>|null  $dueRuns  Explicit list for
     *   tests (avoids the pgsql_privileged cross-connection transaction-visibility issue —
     *   Postgres READ COMMITTED means uncommitted rows on the default test connection are
     *   never visible to a separate connection, even within the same test — same constraint
     *   documented on ReminderService::dispatchDue()). Production callers pass null.
     */
    public function dispatchDue(?array $dueRuns = null): int
    {
        $dueRuns ??= DB::connection('pgsql_privileged')
            ->table('workflow_runs')
            ->where('status', WorkflowRun::STATUS_WAITING)
            ->where('resume_at', '<=', now())
            ->get(['id', 'workspace_id'])
            ->map(fn ($row) => ['id' => $row->id, 'workspace_id' => $row->workspace_id])
            ->all();

        foreach ($dueRuns as $run) {
            AdvanceWorkflowRunJob::dispatch($run['workspace_id'], $run['id']);
        }

        return count($dueRuns);
    }
}

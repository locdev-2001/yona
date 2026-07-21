<?php

namespace App\Jobs;

use App\Modules\Automation\WorkflowEngine;
use App\Support\TenantScope;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Scalar-only job for the Lead-event trigger path (created/assigned/stage
 * changed) — implements ShouldQueueAfterCommit itself, so
 * EvaluateWorkflowTriggers can stay a PLAIN (non-queued) listener.
 *
 * Why not make the listener itself ShouldQueueAfterCommit (real bug found
 * while testing): Laravel wraps a queued LISTENER via CallQueuedListener,
 * which serializes the EVENT's constructor args — including the event's
 * hydrated `Lead $lead` property — through the same
 * SerializesAndRestoresModelIdentifiers machinery as SerializesModels.
 * That restoration runs as part of the queue-job pipeline itself (observed:
 * AFTER the listener's own handle() already completed successfully, in a
 * second internal restoration pass inside CallQueuedHandler) — by which
 * point the RLS-bound tenant context may no longer match, and the
 * restoration throws ModelNotFoundException for a Lead that demonstrably
 * exists. Dispatching a JOB with pure scalar constructor args (no Eloquent
 * model anywhere in the payload) sidesteps this entirely — there is nothing
 * for SerializesModels to restore.
 */
class EnrollWorkflowsForLeadEventJob implements ShouldQueue, ShouldQueueAfterCommit
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public function __construct(
        public readonly string $workspaceId,
        public readonly string $triggerKey,
        public readonly string $leadId,
    ) {}

    public function handle(WorkflowEngine $engine): void
    {
        // runScoped() restores the previous context afterward rather than
        // blindly clearing it — this job commonly runs NESTED inside
        // AdvanceWorkflowRunJob's own scoped section (e.g.
        // ChangeLeadStageNodeHandler → LeadService::moveStage() →
        // LeadStageChanged → this job, all inline on the sync queue); a
        // plain bind()+forget() would wipe the outer job's context the
        // moment this one finishes.
        TenantScope::runScoped($this->workspaceId, function () use ($engine) {
            $engine->enrollActiveWorkflowsForTrigger($this->workspaceId, $this->triggerKey, 'lead', $this->leadId);
        });
    }
}

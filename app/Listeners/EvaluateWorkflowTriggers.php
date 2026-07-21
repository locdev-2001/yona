<?php

namespace App\Listeners;

use App\Events\LeadAssigned;
use App\Events\LeadCreated;
use App\Events\LeadStageChanged;
use App\Events\MessageReceived;
use App\Jobs\DebounceMessageReceivedTriggerJob;
use App\Jobs\EnrollWorkflowsForLeadEventJob;

/**
 * Automation trigger evaluation for the 4 v1 event sources (design doc's
 * "start" node registry: message received / lead created / lead stage
 * changed / lead assigned).
 *
 * Deliberately PLAIN (not ShouldQueue/ShouldQueueAfterCommit) — it fires
 * synchronously the instant the domain event is raised (which may be
 * mid-transaction, e.g. LeadStageChanged fires inside DB::transaction,
 * app/Services/LeadService.php:131-158) and does nothing but read a few
 * already-in-memory scalar properties off the event, then hands off to a
 * scalar-only job. The "wait for commit" guarantee design doc line 74
 * requires lives on that job (EnrollWorkflowsForLeadEventJob /
 * DebounceMessageReceivedTriggerJob), not here — see
 * EnrollWorkflowsForLeadEventJob's docblock for why: wrapping THIS listener
 * itself in ShouldQueueAfterCommit was tried first and found to break
 * (Laravel's CallQueuedListener serializes the event's hydrated Lead model,
 * which fails to restore under this app's RLS timing).
 *
 * Node "start" config convention: {"trigger": "lead_created"|"lead_assigned"
 * |"lead_stage_changed"|"message_received"} — read by
 * WorkflowEngine::enrollActiveWorkflowsForTrigger().
 */
class EvaluateWorkflowTriggers
{
    public function handle(LeadCreated|LeadAssigned|LeadStageChanged|MessageReceived $event): void
    {
        if ($event instanceof MessageReceived) {
            $message = $event->message;

            // Debounce for rapid-fire messages (design doc §Execution
            // semantics): do not enroll immediately — dispatch a delayed
            // job that re-checks whether a newer message arrived first.
            DebounceMessageReceivedTriggerJob::dispatch(
                $message->workspace_id,
                $message->conversation_id,
                $message->created_at->toISOString(),
            )->delay(now()->addSeconds(8));

            return;
        }

        $lead = $event->lead;

        $triggerKey = match (true) {
            $event instanceof LeadCreated => 'lead_created',
            $event instanceof LeadAssigned => 'lead_assigned',
            $event instanceof LeadStageChanged => 'lead_stage_changed',
        };

        EnrollWorkflowsForLeadEventJob::dispatch($lead->workspace_id, $triggerKey, $lead->id);
    }
}

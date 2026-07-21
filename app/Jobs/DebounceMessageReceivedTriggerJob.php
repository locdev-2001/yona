<?php

namespace App\Jobs;

use App\Models\Message;
use App\Modules\Automation\WorkflowEngine;
use App\Support\TenantScope;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Carbon;

/**
 * Debounce for rapid-fire inbound messages (design doc §Execution semantics
 * — job delay ~8s, re-check Message::max(created_at) of the conversation;
 * a newer message means skip, its own delayed job will handle enrollment).
 *
 * Scalar constructor args (not a hydrated Message), same RLS-safety
 * reasoning as AdvanceWorkflowRunJob (Phase 02): workspace context must be
 * bound before any workspace-scoped query runs.
 */
class DebounceMessageReceivedTriggerJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public function __construct(
        public readonly string $workspaceId,
        public readonly string $conversationId,
        public readonly string $triggeringMessageCreatedAt,
    ) {}

    public function handle(WorkflowEngine $engine): void
    {
        // runScoped() restores the previous context afterward rather than
        // blindly clearing it — see AdvanceWorkflowRunJob's docblock for why
        // (a nested scoped job can otherwise wipe an outer one's context).
        TenantScope::runScoped($this->workspaceId, function () use ($engine) {
            $latest = Message::where('conversation_id', $this->conversationId)->max('created_at');

            // Parse both sides through Carbon before comparing — Postgres's
            // raw max() aggregate and the ISO8601 string stamped at dispatch
            // time are NOT the same string format, so a naive `>` string
            // compare would silently always favor one side regardless of
            // actual chronological order.
            if ($latest !== null && Carbon::parse($latest)->gt(Carbon::parse($this->triggeringMessageCreatedAt))) {
                // A newer message arrived since this job was scheduled —
                // that message's own delayed job will handle enrollment.
                return;
            }

            $engine->enrollActiveWorkflowsForTrigger(
                $this->workspaceId,
                'message_received',
                'conversation',
                $this->conversationId,
            );
        });
    }
}

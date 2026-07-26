<?php

namespace App\Modules\Automation\Handlers;

use App\Exceptions\StaleModelException;
use App\Models\Lead;
use App\Models\WorkflowRun;
use App\Modules\Automation\Contracts\NodeHandler;
use App\Modules\Automation\NodeHandlerResult;
use App\Services\LeadService;
use Illuminate\Validation\ValidationException;

/**
 * Đổi Lead stage (action) — delegate LeadService::moveStage() (optimistic-lock
 * sẵn có, fires LeadStageChanged trong DB::transaction). Chỉ hợp lệ khi
 * subject_type=lead — subject khác → skipped.
 */
class ChangeLeadStageNodeHandler implements NodeHandler
{
    public function __construct(private readonly LeadService $leads) {}

    public function type(): string
    {
        return 'change_lead_stage';
    }

    public function handle(WorkflowRun $run, array $node): NodeHandlerResult
    {
        if ($run->subject_type !== 'lead') {
            return NodeHandlerResult::skipped(
                "cannot change lead stage for subject_type={$run->subject_type}",
                branch: null,
            );
        }

        $lead = $run->subject();

        // Kiểm KIỂU chứ không chỉ kiểm chuỗi `subject_type`: quan hệ morph trỏ
        // đi đâu là do dữ liệu quyết, và một hàng hỏng sẽ đưa vào đây thứ không
        // phải Lead.
        if (! $lead instanceof Lead) {
            return NodeHandlerResult::skipped('lead not found', branch: null);
        }

        $stageId = $node['config']['stage_id'] ?? null;

        if ($stageId === null) {
            return NodeHandlerResult::failed('no stage_id configured');
        }

        $order = (int) ($node['config']['order'] ?? 0);

        try {
            $this->leads->moveStage($lead, $stageId, $order);
        } catch (ValidationException $e) {
            return NodeHandlerResult::failed('move stage failed: '.$e->getMessage());
        } catch (StaleModelException) {
            // Optimistic-lock collision (e.g. a rep dragged this lead in the
            // Kanban UI at the same moment) is transient, not a permanent
            // business-rule violation — retry once against a fresh row
            // before giving up, so a one-off race doesn't permanently fail
            // the run (this engine has no generic retry mechanism).
            $freshLead = Lead::find($lead->id);

            if ($freshLead === null) {
                return NodeHandlerResult::skipped('lead not found on retry', branch: null);
            }

            try {
                $this->leads->moveStage($freshLead, $stageId, $order);
            } catch (ValidationException $e) {
                return NodeHandlerResult::failed('move stage failed: '.$e->getMessage());
            } catch (StaleModelException $e) {
                return NodeHandlerResult::failed('move stage failed (retryable — stale lock persisted): '.$e->getMessage());
            }
        }

        return NodeHandlerResult::success('lead stage changed');
    }
}

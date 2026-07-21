<?php

namespace App\Modules\Automation;

use App\Jobs\AdvanceWorkflowRunJob;
use App\Models\Workflow;
use App\Models\WorkflowRun;
use App\Models\WorkflowRunLog;
use App\Services\EntitlementService;
use Illuminate\Database\QueryException;
use RuntimeException;

/**
 * WorkflowEngine — chỉ đi-bộ graph (nodes/edges trong Workflow::$graph),
 * không chứa nghĩa business của từng node (docs/crm-automation-workflow.md
 * §Layer architecture). Mỗi node type (trừ 'start') có đúng 1 NodeHandler,
 * gọi qua NodeHandlerManager.
 *
 * Graph shape: {"nodes":[{"id","type","config"}], "edges":[{"from","to","branch"}]}
 * — "branch" null cho edge thường, true/false cho 2 nhánh của node condition.
 *
 * loop_count cap: kiểm tra 1 chỗ duy nhất trong advance() (không phải per-node-
 * type) — đếm số lần 1 node cụ thể đã bị revisit trong cùng 1 run, dựa trên
 * workflow_run_logs.node_id (không phải tổng số bước, tránh cắt oan hành trình
 * dài không lặp).
 */
class WorkflowEngine
{
    private const LOOP_CAP = 5;

    public function __construct(
        private readonly NodeHandlerManager $handlers,
        private readonly EntitlementService $entitlements,
    ) {}

    /**
     * Enroll 1 subject vào 1 workflow. Không lưu current_node_id ở node
     * "start" — start không có handler, việc trigger match chính là thực thi
     * của nó (đã xảy ra trước khi enroll() được gọi). Dedup dựa vào unique
     * partial index (Phase 01) — double-enroll là no-op, trả về run đang chạy.
     */
    public function enroll(Workflow $workflow, string $subjectType, string $subjectId): WorkflowRun
    {
        $startNode = $this->findStartNode($workflow);
        $firstNodeId = $this->resolveNextNodeId($workflow, $startNode['id'], null);

        if ($firstNodeId === null) {
            throw new RuntimeException("Workflow {$workflow->id}: start node has no outgoing edge.");
        }

        try {
            $run = new WorkflowRun([
                'workflow_id' => $workflow->id,
                'subject_type' => $subjectType,
                'subject_id' => $subjectId,
                'current_node_id' => $firstNodeId,
                'status' => WorkflowRun::STATUS_RUNNING,
                'loop_count' => 0,
            ]);
            $run->save();

            AdvanceWorkflowRunJob::dispatch($run->workspace_id, $run->id);

            return $run;
        } catch (QueryException $e) {
            if ($e->getCode() !== '23505') {
                throw $e;
            }

            return WorkflowRun::where('workflow_id', $workflow->id)
                ->where('subject_type', $subjectType)
                ->where('subject_id', $subjectId)
                ->where('status', WorkflowRun::STATUS_RUNNING)
                ->firstOrFail();
        }
    }

    /**
     * Entry-layer helper: enroll the given subject into every active
     * workflow in this workspace whose start node's `config.trigger` matches
     * `$triggerKey` (e.g. 'lead_created', 'message_received'). Used by
     * EvaluateWorkflowTriggers and DebounceMessageReceivedTriggerJob so
     * neither duplicates "read the start node's trigger config" logic.
     *
     * A workflow missing/malformed start node is skipped, not fatal for the
     * whole batch — Phase 04's write-time validation keeps this from
     * happening for any workflow saved through WorkflowController, but a
     * bad state here must never block OTHER workspaces' workflows from
     * triggering.
     *
     * Entitlement gate lives HERE (not in the listener/jobs that call this)
     * — it's the single path both EnrollWorkflowsForLeadEventJob and
     * DebounceMessageReceivedTriggerJob funnel through, so checking once
     * here covers both without duplicating the check. Independent from the
     * `entitled:module.marketing` route middleware on WorkflowController's
     * write actions (design doc: "2 separate call-sites" — write access and
     * trigger-execution both need the gate on their own, since a workflow
     * can stay is_active=true after a workspace's entitlement lapses).
     */
    public function enrollActiveWorkflowsForTrigger(
        string $workspaceId,
        string $triggerKey,
        string $subjectType,
        string $subjectId,
    ): void {
        if (! $this->entitlements->allows($workspaceId, 'module.marketing')) {
            return;
        }

        $workflows = Workflow::where('workspace_id', $workspaceId)
            ->where('is_active', true)
            ->get();

        foreach ($workflows as $workflow) {
            try {
                $startNode = $this->findStartNode($workflow);
            } catch (RuntimeException) {
                continue;
            }

            if (($startNode['config']['trigger'] ?? null) === $triggerKey) {
                $this->enroll($workflow, $subjectType, $subjectId);
            }
        }
    }

    /**
     * Đi bộ graph từ current_node_id cho tới điểm dừng tiếp theo (wait/end/
     * failed) — TRONG CÙNG 1 lần gọi (vòng lặp in-process), không dispatch
     * job mới giữa chừng.
     *
     * Lý do (bug thật, phát hiện lúc viết test): AdvanceWorkflowRunJob dùng
     * ShouldBeUnique khoá theo workflow_run_id trong SUỐT thời gian handle()
     * chạy. Nếu advance() dispatch job kế tiếp cho CÙNG run ngay bên trong
     * handle() của job hiện tại (job vẫn chưa return), job mới bị chặn im
     * lặng bởi chính khoá của job cũ — run kẹt lại, không bao giờ tới node
     * kế. Dispatch job mới chỉ an toàn ở 2 chỗ: enroll() và
     * ResumeWaitingWorkflowRuns (lúc đó job trước đã hoàn tất, khoá đã nhả).
     *
     * Mỗi node type (trừ start) được gọi handler đúng 1 lần khi trở thành
     * current node — ngoại lệ: node "wait" không gọi lại handler khi resume
     * (status đã là waiting), vì handler của nó chỉ tính resumeAt, gọi lại
     * sẽ tạo vòng chờ vô hạn.
     */
    public function advance(WorkflowRun $run): void
    {
        while (true) {
            $workflow = $run->workflow;
            $node = $this->findNode($workflow, $run->current_node_id);

            if ($node === null) {
                $this->fail($run, $run->current_node_id, 'unknown', 'current_node_id not found in graph');

                return;
            }

            if ($run->status === WorkflowRun::STATUS_WAITING) {
                $run->update(['status' => WorkflowRun::STATUS_RUNNING, 'resume_at' => null]);

                if (! $this->moveToNext($run, $workflow, $node, branch: null)) {
                    return;
                }

                continue;
            }

            try {
                $handler = $this->handlers->handler($node['type']);
                $result = $handler->handle($run, $node);
            } catch (\Throwable $e) {
                // No node type should ever reach here unregistered (Phase 04
                // validates graphs at write-time) — but if it does, fail the
                // run WITH a workflow_run_logs entry instead of throwing
                // uncaught into the queue, where the run would sit at a
                // stale current_node_id forever with the audit trail (this
                // domain's own "why didn't this rule run" answer) empty.
                $this->fail($run, $node['id'], $node['type'], 'node handler error: '.$e->getMessage());

                return;
            }

            WorkflowRunLog::create([
                'workflow_run_id' => $run->id,
                'node_id' => $node['id'],
                'node_type' => $node['type'],
                'result' => $result->result,
                'message' => $result->message,
            ]);

            if ($result->result === WorkflowRunLog::RESULT_FAILED) {
                $run->update(['status' => WorkflowRun::STATUS_FAILED]);

                return;
            }

            if ($node['type'] === 'end') {
                $run->update(['status' => WorkflowRun::STATUS_COMPLETED]);

                return;
            }

            if ($node['type'] === 'wait') {
                $run->update(['status' => WorkflowRun::STATUS_WAITING, 'resume_at' => $result->resumeAt]);

                return;
            }

            if (! $this->moveToNext($run, $workflow, $node, branch: $result->branch)) {
                return;
            }
        }
    }

    /**
     * Resolve + validate the next node, applying the loop cap. Updates
     * `current_node_id` and returns true (loop continues) on success;
     * finalizes the run (failed) and returns false when the walk must stop.
     *
     * @param  array{id: string, type: string, config?: array<string, mixed>}  $fromNode
     */
    private function moveToNext(WorkflowRun $run, Workflow $workflow, array $fromNode, ?bool $branch): bool
    {
        $nextNodeId = $this->resolveNextNodeId($workflow, $fromNode['id'], $branch);

        if ($nextNodeId === null) {
            $this->fail($run, $fromNode['id'], $fromNode['type'], 'no outgoing edge found');

            return false;
        }

        $revisitCount = WorkflowRunLog::where('workflow_run_id', $run->id)
            ->where('node_id', $nextNodeId)
            ->count();

        if ($revisitCount >= self::LOOP_CAP) {
            $nextNode = $this->findNode($workflow, $nextNodeId);

            WorkflowRunLog::create([
                'workflow_run_id' => $run->id,
                'node_id' => $nextNodeId,
                'node_type' => $nextNode['type'] ?? 'unknown',
                'result' => WorkflowRunLog::RESULT_FAILED,
                'message' => 'loop_count_exceeded',
            ]);
            $run->update(['status' => WorkflowRun::STATUS_FAILED, 'loop_count' => $revisitCount]);

            return false;
        }

        $run->update([
            'current_node_id' => $nextNodeId,
            'loop_count' => max($run->loop_count, $revisitCount),
        ]);

        return true;
    }

    private function fail(WorkflowRun $run, ?string $nodeId, string $nodeType, string $message): void
    {
        WorkflowRunLog::create([
            'workflow_run_id' => $run->id,
            'node_id' => $nodeId ?? 'unknown',
            'node_type' => $nodeType,
            'result' => WorkflowRunLog::RESULT_FAILED,
            'message' => $message,
        ]);
        $run->update(['status' => WorkflowRun::STATUS_FAILED]);
    }

    /** @return array{id: string, type: string, config?: array<string, mixed>} */
    private function findStartNode(Workflow $workflow): array
    {
        foreach ($workflow->graph['nodes'] ?? [] as $node) {
            if (($node['type'] ?? null) === 'start') {
                return $node;
            }
        }

        throw new RuntimeException("Workflow {$workflow->id}: graph has no start node.");
    }

    /** @return array{id: string, type: string, config?: array<string, mixed>}|null */
    private function findNode(Workflow $workflow, ?string $nodeId): ?array
    {
        foreach ($workflow->graph['nodes'] ?? [] as $node) {
            if (($node['id'] ?? null) === $nodeId) {
                return $node;
            }
        }

        return null;
    }

    private function resolveNextNodeId(Workflow $workflow, string $fromNodeId, ?bool $branch): ?string
    {
        foreach ($workflow->graph['edges'] ?? [] as $edge) {
            if (($edge['from'] ?? null) !== $fromNodeId) {
                continue;
            }

            if ($branch !== null && ($edge['branch'] ?? null) !== $branch) {
                continue;
            }

            return $edge['to'] ?? null;
        }

        return null;
    }
}

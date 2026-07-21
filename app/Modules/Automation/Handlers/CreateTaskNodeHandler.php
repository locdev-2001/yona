<?php

namespace App\Modules\Automation\Handlers;

use App\Models\Task;
use App\Models\WorkflowRun;
use App\Modules\Automation\Contracts\NodeHandler;
use App\Modules\Automation\NodeHandlerResult;
use App\Services\TaskService;
use Throwable;

/**
 * Tạo Task (action) — delegate TaskService::create().
 *
 * Gate: Task.related_type chỉ nhận lead|client|project|contact (KHÔNG nhận
 * conversation trực tiếp — app/Models/Task.php:68). subject=conversation →
 * skipped, không phải lỗi.
 */
class CreateTaskNodeHandler implements NodeHandler
{
    public function __construct(private readonly TaskService $tasks) {}

    public function type(): string
    {
        return 'create_task';
    }

    public function handle(WorkflowRun $run, array $node): NodeHandlerResult
    {
        $relatedType = match ($run->subject_type) {
            'lead' => 'lead',
            'contact' => 'contact',
            default => null,
        };

        if ($relatedType === null) {
            return NodeHandlerResult::skipped(
                "cannot create a task for subject_type={$run->subject_type} (no valid related_type)",
                branch: null,
            );
        }

        $config = $node['config'] ?? [];

        $data = [
            'name' => $config['name'] ?? 'Automation task',
            'description' => $config['description'] ?? null,
            'priority' => $config['priority'] ?? Task::PRIORITY_MEDIUM,
            'due_date' => isset($config['due_in_days'])
                ? now()->addDays((int) $config['due_in_days'])->toDateString()
                : null,
        ];

        try {
            $this->tasks->create($data, $relatedType, $run->subject_id, [], []);
        } catch (Throwable $e) {
            // Broad catch is deliberate (never let a service error crash the
            // engine loop) — include the exception class so a genuine bug
            // (e.g. a config typo tripping TaskService's related_type guard)
            // is still distinguishable in the audit log.
            return NodeHandlerResult::failed('create task failed ('.$e::class.'): '.$e->getMessage());
        }

        return NodeHandlerResult::success('task created');
    }
}

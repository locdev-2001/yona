<?php

namespace Modules\Projects\Http\Controllers\Tasks;

use App\Http\Controllers\Controller;
use Modules\Projects\Http\Requests\Tasks\TaskKanbanReorderRequest;
use Modules\Projects\Models\Task;
use Modules\Projects\Services\TaskService;
use Illuminate\Http\RedirectResponse;

/**
 * Kanban drag-reorder. Changes status + kanban_order atomically.
 */
class TaskKanbanController extends Controller
{
    public function __construct(private readonly TaskService $taskService) {}

    public function reorder(TaskKanbanReorderRequest $request, Task $task): RedirectResponse
    {
        $this->taskService->reorderKanban(
            task: $task,
            status: $request->integer('status'),
            order: $request->integer('order'),
        );

        return back();
    }
}

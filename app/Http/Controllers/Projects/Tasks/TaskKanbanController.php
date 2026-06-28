<?php

namespace App\Http\Controllers\Projects\Tasks;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tasks\TaskKanbanReorderRequest;
use App\Models\Task;
use App\Services\TaskService;
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

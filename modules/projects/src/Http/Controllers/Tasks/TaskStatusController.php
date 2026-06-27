<?php

namespace Modules\Projects\Http\Controllers\Tasks;

use App\Http\Controllers\Controller;
use Modules\Projects\Http\Requests\Tasks\TaskStatusUpdateRequest;
use Modules\Projects\Models\Task;
use Modules\Projects\Services\TaskService;
use Illuminate\Http\RedirectResponse;

/**
 * Change task status (inline update, kanban status change).
 */
class TaskStatusController extends Controller
{
    public function __construct(private readonly TaskService $taskService) {}

    public function update(TaskStatusUpdateRequest $request, Task $task): RedirectResponse
    {
        $this->taskService->changeStatus($task, $request->integer('status'));

        return back()->with('success', __('tasks.status_updated'));
    }
}

<?php

namespace Modules\Projects\Http\Controllers\Tasks;

use App\Http\Controllers\Controller;
use Modules\Projects\Http\Requests\Tasks\TaskAssignRequest;
use Modules\Projects\Models\Task;
use Modules\Projects\Services\TaskService;
use Illuminate\Http\RedirectResponse;

/**
 * Sync task assignees. Replaces full list (sync, not additive).
 */
class TaskAssigneeController extends Controller
{
    public function __construct(private readonly TaskService $taskService) {}

    public function update(TaskAssignRequest $request, Task $task): RedirectResponse
    {
        $this->taskService->assign($task, $request->input('user_ids', []), $request->user());

        return back()->with('success', __('tasks.assigned'));
    }
}

<?php

namespace App\Http\Controllers\Projects\Tasks;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tasks\TaskAssignRequest;
use App\Models\Task;
use App\Services\TaskService;
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

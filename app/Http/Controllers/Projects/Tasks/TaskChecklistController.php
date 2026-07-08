<?php

namespace App\Http\Controllers\Projects\Tasks;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tasks\ChecklistItemStoreRequest;
use App\Models\Task;
use App\Models\TaskChecklistItem;
use App\Services\TaskService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * CRUD + toggle + reorder for task checklist items.
 */
class TaskChecklistController extends Controller
{
    public function __construct(private readonly TaskService $taskService) {}

    public function store(ChecklistItemStoreRequest $request, Task $task): RedirectResponse
    {
        $this->taskService->addChecklistItem(
            task: $task,
            description: $request->string('description')->toString(),
            assignedUserId: $request->integer('assigned_user_id') ?: null,
        );

        return back()->with('success', __('tasks.checklist.added'));
    }

    /** Toggle finished/unfinished. */
    public function toggle(Task $task, TaskChecklistItem $item): RedirectResponse
    {
        $this->authorize('update', $task);

        $this->taskService->toggleChecklistItem($item);

        return back();
    }

    /** Reorder checklist items. Body: {ordered_ids: ['uuid1','uuid2',...]}. */
    public function reorder(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);

        $request->validate([
            'ordered_ids' => ['required', 'array'],
            'ordered_ids.*' => ['uuid'],
        ]);

        $this->taskService->reorderChecklist($task, $request->input('ordered_ids'));

        return back();
    }

    public function destroy(Task $task, TaskChecklistItem $item): RedirectResponse
    {
        $this->authorize('update', $task);

        $this->taskService->deleteChecklistItem($item);

        return back()->with('success', __('tasks.checklist.deleted'));
    }
}

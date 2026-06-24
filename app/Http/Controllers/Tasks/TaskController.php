<?php

namespace App\Http\Controllers\Tasks;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tasks\TaskStoreRequest;
use App\Http\Requests\Tasks\TaskUpdateRequest;
use App\Models\Task;
use App\Services\TaskService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Task CRUD + list/kanban/show. Thin controller — logic in TaskService.
 * abort(404) for any visibility failure (BR-X15 non-enumeration, G2).
 */
class TaskController extends Controller
{
    public function __construct(private readonly TaskService $taskService) {}

    /** Task list with filters. */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Task::class);

        $user = $request->user();
        $query = Task::query()->with(['assignees:id,name', 'milestone:id,name', 'tags:id,name,color']);

        // view_own filter: only tasks the user owns or is assigned to
        if (! $user->can('tenant.task.view') && $user->can('tenant.task.view_own')) {
            $query->where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                    ->orWhereHas('assignees', fn ($a) => $a->where('users.id', $user->id));
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->integer('status'));
        }

        if ($request->filled('assignee')) {
            $query->whereHas('assignees', fn ($q) => $q->where('users.id', $request->input('assignee')));
        }

        if ($request->filled('related_type')) {
            $query->where('related_type', $request->input('related_type'));
        }

        if ($request->filled('search')) {
            $query->where('name', 'ilike', '%'.$request->input('search').'%');
        }

        $tasks = $query->orderBy('kanban_order')->paginate(25)->withQueryString();

        return Inertia::render('tasks/index', [
            'tasks' => $tasks,
            'filters' => $request->only(['status', 'assignee', 'related_type', 'search']),
            'can' => [
                'create' => $user->can('tenant.task.create'),
            ],
        ]);
    }

    /** Kanban board view — grouped by status. */
    public function kanban(Request $request): Response
    {
        $this->authorize('viewAny', Task::class);

        $user = $request->user();

        $columns = [];

        foreach (Task::STATUSES as $status) {
            $query = Task::query()
                ->with(['assignees:id,name', 'milestone:id,name'])
                ->where('status', $status)
                ->orderBy('kanban_order');

            if (! $user->can('tenant.task.view') && $user->can('tenant.task.view_own')) {
                $query->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('assignees', fn ($a) => $a->where('users.id', $user->id));
                });
            }

            $columns[$status] = $query->get()->map(fn (Task $task) => $this->taskCard($task));
        }

        return Inertia::render('tasks/kanban', [
            'columns' => $columns,
            'can' => [
                'create' => $user->can('tenant.task.create'),
                'update' => $user->can('tenant.task.update'),
            ],
        ]);
    }

    /** Task detail page. */
    public function show(Task $task): Response
    {
        // Non-enumeration: 404 if not viewable (BR-X15)
        if (! request()->user()->can('view', $task)) {
            abort(404);
        }

        $task->load([
            'assignees:id,name,email',
            'followers:id,name',
            'checklistItems.assignedUser:id,name',
            'timers.user:id,name',
            'milestone:id,name',
            'comments.author:id,name',
            'attachments',
            'tags:id,name,color',
            'reminders',
            'activities.actor',
        ]);

        return Inertia::render('tasks/show', [
            'task' => $task,
            'can' => [
                'update' => request()->user()->can('update', $task),
                'delete' => request()->user()->can('delete', $task),
                'log_time' => request()->user()->can('logTime', $task),
            ],
        ]);
    }

    /** Create task. */
    public function store(TaskStoreRequest $request): RedirectResponse
    {
        $task = $this->taskService->create(
            data: $request->safe()->except(['related_type', 'related_id', 'assignee_ids', 'custom_fields']),
            relatedType: $request->input('related_type'),
            relatedId: $request->input('related_id'),
            assigneeIds: $request->input('assignee_ids', []),
            customFields: $request->input('custom_fields', []),
        );

        return redirect()->route('tasks.show', $task)
            ->with('success', __('tasks.created'));
    }

    /** Update task. */
    public function update(TaskUpdateRequest $request, Task $task): RedirectResponse
    {
        $this->taskService->update(
            task: $task,
            data: $request->safe()->except(['related_type', 'related_id', 'custom_fields', 'lock_version']),
            customFields: $request->input('custom_fields', []),
        );

        return back()->with('success', __('tasks.updated'));
    }

    /** Soft-delete task. */
    public function destroy(Task $task): RedirectResponse
    {
        $this->authorize('delete', $task);

        $this->taskService->delete($task);

        return redirect()->route('tasks.index')
            ->with('success', __('tasks.deleted'));
    }

    /** @return array<string, mixed> */
    private function taskCard(Task $task): array
    {
        return [
            'id' => $task->id,
            'task_number' => $task->task_number,
            'name' => $task->name,
            'status' => $task->status,
            'priority' => $task->priority,
            'kanban_order' => $task->kanban_order,
            'due_date' => $task->due_date,
            'assignees' => $task->assignees->map(fn ($u) => ['id' => $u->id, 'name' => $u->name]),
            'milestone' => $task->milestone ? ['id' => $task->milestone->id, 'name' => $task->milestone->name] : null,
        ];
    }
}

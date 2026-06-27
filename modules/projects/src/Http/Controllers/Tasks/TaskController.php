<?php

namespace Modules\Projects\Http\Controllers\Tasks;

use App\Http\Controllers\Controller;
use Modules\Projects\Http\Requests\Tasks\TaskStoreRequest;
use Modules\Projects\Http\Requests\Tasks\TaskUpdateRequest;
use Modules\CrmSales\Models\Client;
use Modules\CrmSales\Models\Contact;
use Modules\CrmSales\Models\Lead;
use Modules\Projects\Models\Project;
use Modules\Projects\Models\Task;
use Modules\Projects\Services\TaskService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Identity\Models\User;

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

        return Inertia::render('Modules.Projects.tasks/index', [
            'tasks' => $tasks,
            'filters' => $request->only(['status', 'assignee', 'related_type', 'search']),
            'can' => [
                'create' => $user->can('tenant.task.create'),
            ],
            'relatedRecords' => $this->relatedRecords(),
            'members' => $this->workspaceMembers(),
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

        return Inertia::render('Modules.Projects.tasks/kanban', [
            'columns' => $columns,
            'can' => [
                'create' => $user->can('tenant.task.create'),
                'update' => $user->can('tenant.task.update'),
            ],
            'relatedRecords' => $this->relatedRecords(),
            'members' => $this->workspaceMembers(),
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

        return Inertia::render('Modules.Projects.tasks/show', [
            'task' => $task,
            'can' => [
                'update' => request()->user()->can('update', $task),
                'delete' => request()->user()->can('delete', $task),
                'log_time' => request()->user()->can('logTime', $task),
            ],
            'relatedRecords' => $this->relatedRecords(),
            'members' => $this->workspaceMembers(),
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
            // Keep related_type/related_id in the data so edits to the linked record
            // persist (TaskService::update applies them atomically, G12). assignee_ids
            // are managed via the dedicated assignees endpoint, not the update form.
            data: $request->safe()->except(['assignee_ids', 'custom_fields', 'lock_version']),
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

    /**
     * Workspace-scoped lookup lists for the related_type picker.
     * Returns only id+name for each type — enough for a Select.
     *
     * @return array<string, array<array{id: string, name: string}>>
     */
    private function relatedRecords(): array
    {
        return [
            'lead' => Lead::select('id', 'name')->orderBy('name')->get()->toArray(),
            'client' => Client::select('id', 'name')->orderBy('name')->get()->toArray(),
            'project' => Project::select('id', 'name')->orderBy('name')->get()->toArray(),
            'contact' => Contact::selectRaw("id, CONCAT(first_name, ' ', COALESCE(last_name, '')) AS name")
                ->orderBy('first_name')
                ->get()
                ->map(fn ($c) => ['id' => $c->id, 'name' => trim($c->name)])
                ->toArray(),
        ];
    }

    /**
     * Active workspace members for the assignee picker.
     *
     * @return array<array{id: int, name: string}>
     */
    private function workspaceMembers(): array
    {
        $workspaceId = currentWorkspace()->id;

        return User::whereHas(
            'memberships',
            fn ($q) => $q->where('workspace_id', $workspaceId)->where('status', 'active'),
        )
            ->select('id', 'name')
            ->orderBy('name')
            ->get()
            ->toArray();
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

<?php

namespace App\Http\Controllers\Projects;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\ChangeProjectStatusRequest;
use App\Http\Requests\Projects\StoreProjectRequest;
use App\Http\Requests\Projects\UpdateProjectRequest;
use App\Models\Client;
use App\Models\Project;
use App\Models\ProjectStatus;
use App\Services\ProjectService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Identity\Models\User;
use Modules\Shared\Models\CustomFieldDefinition;

/**
 * P08 — Thin project controller. Parse → Service → Inertia/redirect.
 * Non-enumeration: foreign record → abort(404) via RLS + route-model-binding.
 * workspace_id NEVER from request — always from currentWorkspace().
 */
class ProjectController extends Controller
{
    public function __construct(private readonly ProjectService $projectService) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Project::class);

        $user = $request->user();
        $canViewAll = $user->can('tenant.project.view');

        $query = Project::query()
            ->with([
                'client:id,name',
                'status:id,name,color',
                'owner:id,name',
            ]);

        // Visibility filter: if only view_own, limit to owned or member
        if (! $canViewAll) {
            $userId = $user->id;
            $query->where(function ($q) use ($userId) {
                $q->where('owner_id', $userId)
                    ->orWhereHas('members', fn ($q2) => $q2->where('users.id', $userId));
            });
        }

        if ($search = $request->string('search')->toString()) {
            $query->where('name', 'ilike', '%'.$search.'%');
        }

        if ($statusId = $request->input('status')) {
            $query->where('status_id', $statusId);
        }

        if ($request->boolean('pinned')) {
            $query->where('is_pinned', true);
        }

        $projects = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        $statuses = ProjectStatus::orderBy('status_order')->get(['id', 'name', 'color']);

        return Inertia::render('projects/index', [
            'projects' => $projects,
            'statuses' => $statuses,
            'filters' => $request->only(['search', 'status', 'pinned']),
            'can' => [
                'create' => $user->can('tenant.project.create'),
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', Project::class);

        $workspace = currentWorkspace();
        $clients = Client::orderBy('name')->get(['id', 'name']);
        $statuses = ProjectStatus::orderBy('status_order')->get(['id', 'name', 'color']);
        $fieldDefs = CustomFieldDefinition::forEntity('project')->active()->ordered()->get();
        $members = User::whereHas('memberships', fn ($q) => $q->where('workspace_id', $workspace->id)->where('status', 'active'))
            ->get(['id', 'name']);

        return Inertia::render('projects/create', [
            'clients' => $clients,
            'statuses' => $statuses,
            'members' => $members,
            'fieldDefs' => $fieldDefs,
        ]);
    }

    public function store(StoreProjectRequest $request): RedirectResponse
    {
        // owner_id is not in StoreProjectRequest (G12 intentionally excludes it from validated())
        // We read it directly and validate workspace membership here before passing to service.
        $ownerId = $request->user()->id;
        if ($requestedOwner = $request->input('owner_id')) {
            $workspace = currentWorkspace();
            $ownerExists = User::whereHas('memberships', fn ($q) => $q->where('workspace_id', $workspace->id)->where('status', 'active'))
                ->where('id', $requestedOwner)->exists();
            if ($ownerExists) {
                $ownerId = (int) $requestedOwner;
            }
        }

        $project = $this->projectService->create(
            $request->validated(),
            $ownerId
        );

        return redirect()->route('projects.show', $project)
            ->with('success', __('projects.messages.created'));
    }

    public function show(Request $request, Project $project): Response
    {
        if (! $request->user()->can('view', $project)) {
            abort(404);
        }

        $project->load([
            'client:id,name',
            'status:id,name,color',
            'owner:id,name',
            'team:id,name',
            'members:id,name',
            'milestones',
            'discussions.author:id,name',
            'attachments',
            'activities',
        ]);

        $statuses = ProjectStatus::orderBy('status_order')->get(['id', 'name', 'color']);
        $fieldDefs = CustomFieldDefinition::forEntity('project')->active()->ordered()->get();

        return Inertia::render('projects/show', [
            'project' => $project,
            'statuses' => $statuses,
            'fieldDefs' => $fieldDefs,
            'can' => [
                'update' => $request->user()->can('update', $project),
                'delete' => $request->user()->can('delete', $project),
                'manageMembers' => $request->user()->can('update', $project),
            ],
        ]);
    }

    public function edit(Request $request, Project $project): Response
    {
        if (! $request->user()->can('update', $project)) {
            abort(404);
        }

        $workspace = currentWorkspace();
        $clients = Client::orderBy('name')->get(['id', 'name']);
        $statuses = ProjectStatus::orderBy('status_order')->get(['id', 'name', 'color']);
        $fieldDefs = CustomFieldDefinition::forEntity('project')->active()->ordered()->get();
        $members = User::whereHas('memberships', fn ($q) => $q->where('workspace_id', $workspace->id)->where('status', 'active'))
            ->get(['id', 'name']);

        return Inertia::render('projects/edit', [
            'project' => $project->load(['client:id,name', 'status:id,name,color', 'owner:id,name']),
            'clients' => $clients,
            'statuses' => $statuses,
            'members' => $members,
            'fieldDefs' => $fieldDefs,
        ]);
    }

    public function update(UpdateProjectRequest $request, Project $project): RedirectResponse
    {
        // owner_id not in UpdateProjectRequest rules — handle separately with membership check
        if ($requestedOwner = $request->input('owner_id')) {
            $workspace = currentWorkspace();
            $ownerExists = User::whereHas('memberships', fn ($q) => $q->where('workspace_id', $workspace->id)->where('status', 'active'))
                ->where('id', $requestedOwner)->exists();
            if ($ownerExists) {
                $project->owner_id = (int) $requestedOwner;
            }
        }

        $this->projectService->update($project, $request->validated());

        return redirect()->route('projects.show', $project)
            ->with('success', __('projects.messages.updated'));
    }

    public function destroy(Request $request, Project $project): RedirectResponse
    {
        if (! $request->user()->can('delete', $project)) {
            abort(404);
        }

        $this->projectService->delete($project);

        return redirect()->route('projects.index')
            ->with('success', __('projects.messages.deleted'));
    }

    public function changeStatus(ChangeProjectStatusRequest $request, Project $project): RedirectResponse
    {
        $this->projectService->changeStatus($project, $request->validated('status_id'));

        return back()->with('success', __('projects.messages.status_changed'));
    }

    public function togglePin(Request $request, Project $project): RedirectResponse
    {
        if (! $request->user()->can('update', $project)) {
            abort(404);
        }

        $this->projectService->togglePin($project);

        return back();
    }

    public function recalcProgress(Request $request, Project $project): RedirectResponse
    {
        if (! $request->user()->can('update', $project)) {
            abort(404);
        }

        $this->projectService->recalcProgressFromTasks($project);

        return back()->with('success', __('projects.messages.progress_recalculated'));
    }
}

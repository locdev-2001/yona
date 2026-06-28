<?php

namespace App\Http\Controllers\Crm\Leads;

use App\Http\Controllers\Controller;
use App\Http\Requests\Leads\AssignLeadRequest;
use App\Http\Requests\Leads\StoreLeadRequest;
use App\Http\Requests\Leads\UpdateLeadRequest;
use App\Models\Client;
use App\Models\Lead;
use App\Models\LeadSource;
use App\Models\Pipeline;
use App\Services\LeadService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\User;
use App\Models\CustomFieldDefinition;

/**
 * P07 — Thin lead controller. Parse → Service → Inertia/redirect.
 * Non-enumeration: foreign lead → abort(404) via route-model-binding + RLS + Policy.
 */
class LeadController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Lead::class);

        $user = $request->user();

        $query = Lead::visibleTo($user)
            ->with([
                'pipeline:id,name',
                'stage:id,name,color,type',
                'source:id,name',
                'assignee:id,name',
                'tags',
            ]);

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', '%'.$search.'%')
                    ->orWhere('email', 'ilike', '%'.$search.'%')
                    ->orWhere('company', 'ilike', '%'.$search.'%');
            });
        }

        if ($pipelineId = $request->input('pipeline')) {
            $query->where('pipeline_id', $pipelineId);
        }

        if ($stageId = $request->input('stage')) {
            $query->where('stage_id', $stageId);
        }

        $leads = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        return Inertia::render('crm/leads/index', [
            'leads' => $leads,
            'pipelines' => Pipeline::orderBy('name')->get(['id', 'name', 'is_default']),
            'filters' => $request->only(['search', 'pipeline', 'stage']),
        ]);
    }

    public function kanban(Request $request, LeadService $service, ?string $pipeline = null): Response
    {
        $this->authorize('viewAny', Lead::class);

        $user = $request->user();
        $workspace = currentWorkspace();

        // Resolve pipeline: use provided, else default, else first
        $activePipeline = $pipeline
            ? Pipeline::where('id', $pipeline)->where('workspace_id', $workspace->id)->firstOrFail()
            : Pipeline::where('workspace_id', $workspace->id)
                ->orderByDesc('is_default')
                ->orderBy('name')
                ->first();

        $board = $activePipeline ? $service->kanban($activePipeline->id, $user) : [];

        return Inertia::render('crm/leads/kanban', [
            'board' => $board,
            'activePipeline' => $activePipeline,
            'pipelines' => Pipeline::orderBy('name')->get(['id', 'name', 'is_default']),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Lead::class);

        $workspace = currentWorkspace();

        return Inertia::render('crm/leads/create', [
            'pipelines' => Pipeline::with(['stages' => fn ($q) => $q->orderBy('stage_order')])->get(['id', 'name', 'is_default']),
            'sources' => LeadSource::orderBy('name')->get(['id', 'name']),
            'members' => User::whereHas('memberships', fn ($q) => $q->where('workspace_id', $workspace->id)->where('status', 'active'))
                ->get(['id', 'name']),
            'fieldDefs' => CustomFieldDefinition::forEntity('lead')->active()->ordered()->get(),
        ]);
    }

    public function store(StoreLeadRequest $request, LeadService $service): RedirectResponse
    {
        $lead = $service->create($request->validated());

        return redirect()
            ->route('leads.show', $lead)
            ->with('success', __('leads.flash.created'));
    }

    public function show(Lead $lead): Response
    {
        $this->authorize('view', $lead);

        $lead->load([
            'pipeline:id,name',
            'stage:id,name,color,type',
            'source:id,name',
            'assignee:id,name',
            'owner:id,name',
            'convertedClient:id,name',
            'activities' => fn ($q) => $q->latest('occurred_at')->limit(50),
            'tags',
            'notes' => fn ($q) => $q->latest()->limit(20),
            'attachments' => fn ($q) => $q->latest()->limit(20),
            'reminders' => fn ($q) => $q->where('is_notified', false)->orderBy('remind_at')->limit(10),
        ]);

        $workspace = currentWorkspace();

        return Inertia::render('crm/leads/show', [
            'lead' => $lead,
            'fieldDefs' => CustomFieldDefinition::forEntity('lead')->active()->ordered()->get(),
            'sources' => LeadSource::orderBy('name')->get(['id', 'name']),
            'members' => User::whereHas('memberships', fn ($q) => $q->where('workspace_id', $workspace->id)->where('status', 'active'))
                ->get(['id', 'name']),
            'clients' => Client::where('workspace_id', $workspace->id)->orderBy('name')->get(['id', 'name']),
            'allPipelineStages' => $lead->pipeline
                ? $lead->pipeline->stages()->orderBy('stage_order')->get(['id', 'name', 'color', 'type'])
                : [],
        ]);
    }

    public function edit(Lead $lead): Response
    {
        $this->authorize('update', $lead);

        $workspace = currentWorkspace();

        $lead->load(['pipeline:id,name', 'stage:id,name,color', 'source:id,name', 'assignee:id,name', 'tags']);

        return Inertia::render('crm/leads/edit', [
            'lead' => $lead,
            'pipelines' => Pipeline::with(['stages' => fn ($q) => $q->orderBy('stage_order')])->get(['id', 'name', 'is_default']),
            'sources' => LeadSource::orderBy('name')->get(['id', 'name']),
            'members' => User::whereHas('memberships', fn ($q) => $q->where('workspace_id', $workspace->id)->where('status', 'active'))
                ->get(['id', 'name']),
            'fieldDefs' => CustomFieldDefinition::forEntity('lead')->active()->ordered()->get(),
        ]);
    }

    public function update(UpdateLeadRequest $request, Lead $lead, LeadService $service): RedirectResponse
    {
        $service->update($lead, $request->validated());

        return redirect()
            ->route('leads.show', $lead)
            ->with('success', __('leads.flash.updated'));
    }

    public function destroy(Lead $lead, LeadService $service): RedirectResponse
    {
        $this->authorize('delete', $lead);

        $lead->delete();

        return redirect()
            ->route('leads.index')
            ->with('success', __('leads.flash.deleted'));
    }

    /**
     * Assign or unassign a lead.
     */
    public function assign(AssignLeadRequest $request, Lead $lead, LeadService $service): RedirectResponse
    {
        $service->assign($lead, $request->validated()['assigned_to'] ?? null);

        return back()->with('success', __('leads.flash.assigned'));
    }
}


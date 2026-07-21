<?php

namespace App\Http\Controllers\Automation;

use App\Enums\TenantPermission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Automation\StoreWorkflowRequest;
use App\Http\Requests\Automation\UpdateWorkflowRequest;
use App\Models\Pipeline;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowRun;
use App\Modules\Automation\WorkflowEngine;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Thin CRUD for Workflow.graph — zero business logic (design doc's Layer
 * architecture: Entry layer). Engine execution is triggered separately by
 * EvaluateWorkflowTriggers / the resume cron, never by this controller,
 * except the explicit manual-enroll action ("Chạy thủ công" start node —
 * a real user action, so a synchronous WorkflowEngine::enroll() call here
 * is correct, not a layering violation).
 */
class WorkflowController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->can(TenantPermission::AutomationManage->value), 403);

        return Inertia::render('automation/index', [
            'workflows' => Workflow::orderBy('name')->get(['id', 'name', 'is_active', 'updated_at']),
        ]);
    }

    public function create(Request $request): Response
    {
        abort_unless($request->user()?->can(TenantPermission::AutomationManage->value), 403);

        return Inertia::render('automation/create', $this->formOptions());
    }

    public function show(Request $request, Workflow $workflow): Response
    {
        abort_unless($request->user()?->can(TenantPermission::AutomationManage->value), 403);

        return Inertia::render('automation/show', ['workflow' => $workflow, ...$this->formOptions()]);
    }

    public function store(StoreWorkflowRequest $request): RedirectResponse
    {
        $workflow = Workflow::create($request->validated());

        return redirect()->route('automation.workflows.show', $workflow)->with('success', 'Workflow created.');
    }

    public function update(UpdateWorkflowRequest $request, Workflow $workflow): RedirectResponse
    {
        $workflow->update($request->validated());

        return back()->with('success', 'Workflow updated.');
    }

    public function destroy(Request $request, Workflow $workflow): RedirectResponse
    {
        abort_unless($request->user()?->can(TenantPermission::AutomationManage->value), 403);

        $workflow->delete();

        return redirect()->route('automation.workflows.index');
    }

    /**
     * Manual enroll — "Chạy thủ công" start node. Synchronous: an explicit
     * user action, not an async trigger, so there's no debounce/queue need.
     */
    public function enroll(Request $request, Workflow $workflow): RedirectResponse
    {
        abort_unless($request->user()?->can(TenantPermission::AutomationManage->value), 403);

        $data = $request->validate([
            'subject_type' => ['required', 'string', Rule::in(WorkflowRun::SUBJECT_TYPES)],
            'subject_id' => ['required', 'uuid'],
        ]);

        app(WorkflowEngine::class)->enroll($workflow, $data['subject_type'], $data['subject_id']);

        return back()->with('success', 'Enrolled.');
    }

    /**
     * Canvas editor's inspector-panel dropdown sources — same pair
     * `LeadController::create()` already exposes (pipelines+stages for
     * `change_lead_stage`, members for `notify_internal`'s recipient picker).
     *
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        $workspace = currentWorkspace();

        return [
            'pipelines' => Pipeline::with(['stages' => fn ($q) => $q->orderBy('stage_order')])->get(['id', 'name', 'is_default']),
            'members' => User::whereHas('memberships', fn ($q) => $q->where('workspace_id', $workspace->id)->where('status', 'active'))
                ->get(['id', 'name']),
        ];
    }
}

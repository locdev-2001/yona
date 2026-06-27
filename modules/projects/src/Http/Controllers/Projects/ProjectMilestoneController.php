<?php

namespace Modules\Projects\Http\Controllers\Projects;

use App\Http\Controllers\Controller;
use Modules\Projects\Http\Requests\Projects\ReorderMilestonesRequest;
use Modules\Projects\Http\Requests\Projects\StoreProjectMilestoneRequest;
use Modules\Projects\Models\Project;
use Modules\Projects\Models\ProjectMilestone;
use Modules\Projects\Services\ProjectMilestoneService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * P08 — Thin milestone controller (create / update / reorder / delete).
 */
class ProjectMilestoneController extends Controller
{
    public function __construct(private readonly ProjectMilestoneService $milestoneService) {}

    public function store(StoreProjectMilestoneRequest $request, Project $project): RedirectResponse
    {
        $this->milestoneService->create($project, $request->validated());

        return back()->with('success', __('projects.messages.milestone_created'));
    }

    public function update(StoreProjectMilestoneRequest $request, Project $project, ProjectMilestone $milestone): RedirectResponse
    {
        if (! $request->user()->can('update', $project)) {
            abort(404);
        }

        $this->milestoneService->update($milestone, $request->validated());

        return back()->with('success', __('projects.messages.milestone_updated'));
    }

    public function reorder(ReorderMilestonesRequest $request, Project $project): RedirectResponse
    {
        $this->milestoneService->reorder($project, $request->validated('ordered_ids'));

        return back();
    }

    public function destroy(Request $request, Project $project, ProjectMilestone $milestone): RedirectResponse
    {
        if (! $request->user()->can('update', $project)) {
            abort(404);
        }

        $this->milestoneService->delete($milestone);

        return back()->with('success', __('projects.messages.milestone_deleted'));
    }
}

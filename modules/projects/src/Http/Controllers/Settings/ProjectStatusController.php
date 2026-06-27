<?php

namespace Modules\Projects\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Modules\Projects\Http\Requests\Settings\ProjectStatusStoreRequest;
use Modules\Projects\Http\Requests\Settings\ProjectStatusUpdateRequest;
use Modules\Projects\Models\ProjectStatus;
use Modules\CrmSales\Services\LookupService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Settings → Lookups → Project Statuses (admin-only).
 */
class ProjectStatusController extends Controller
{
    public function index(): Response
    {
        $this->authorize('viewAny', ProjectStatus::class);

        $statuses = ProjectStatus::orderBy('status_order')
            ->get(['id', 'name', 'color', 'status_order'])
            ->map(fn (ProjectStatus $status) => [
                'id' => $status->id,
                'name' => $status->name,
                'color' => $status->color,
                'status_order' => $status->status_order,
            ]);

        return Inertia::render('settings/lookups/project-statuses', [
            'statuses' => $statuses,
        ]);
    }

    public function store(ProjectStatusStoreRequest $request, LookupService $lookup): RedirectResponse
    {
        $lookup->createProjectStatus($request->only(['name', 'color', 'status_order']));

        return back()->with('success', __('lookups.project_statuses.saved'));
    }

    public function update(ProjectStatusUpdateRequest $request, ProjectStatus $projectStatus): RedirectResponse
    {
        $this->authorize('update', $projectStatus);

        $projectStatus->fill($request->only(['name', 'color', 'status_order']));
        $projectStatus->save();

        return back()->with('success', __('lookups.project_statuses.saved'));
    }

    public function destroy(ProjectStatus $projectStatus): RedirectResponse
    {
        $this->authorize('delete', $projectStatus);

        app(LookupService::class)->deleteProjectStatus($projectStatus);

        return back()->with('success', __('lookups.project_statuses.deleted'));
    }
}

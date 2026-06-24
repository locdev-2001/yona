<?php

namespace App\Http\Controllers\Projects;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\AddProjectMemberRequest;
use App\Models\Project;
use App\Services\ProjectService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * P08 — Manage project members (add / remove).
 * G12: Service asserts active WorkspaceMember; FormRequest is defense-in-depth.
 * G2: manageMembers gate (tenant.project.update).
 */
class ProjectMemberController extends Controller
{
    public function __construct(private readonly ProjectService $projectService) {}

    public function store(AddProjectMemberRequest $request, Project $project): RedirectResponse
    {
        try {
            $this->projectService->addMember($project, (int) $request->validated('user_id'));
        } catch (\RuntimeException $e) {
            return back()->withErrors(['user_id' => $e->getMessage()]);
        }

        return back()->with('success', __('projects.messages.member_added'));
    }

    public function destroy(Request $request, Project $project, int $userId): RedirectResponse
    {
        if (! $request->user()->can('update', $project)) {
            abort(404);
        }

        $this->projectService->removeMember($project, $userId);

        return back()->with('success', __('projects.messages.member_removed'));
    }
}

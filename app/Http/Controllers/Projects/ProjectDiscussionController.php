<?php

namespace App\Http\Controllers\Projects;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\StoreDiscussionReplyRequest;
use App\Http\Requests\Projects\StoreProjectDiscussionRequest;
use App\Models\Project;
use App\Models\ProjectDiscussion;
use App\Services\ProjectDiscussionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * P08 — Thin discussion/reply controller.
 * Threads = project_discussions; replies = comments via HasComments (DRY).
 */
class ProjectDiscussionController extends Controller
{
    public function __construct(private readonly ProjectDiscussionService $discussionService) {}

    public function store(StoreProjectDiscussionRequest $request, Project $project): RedirectResponse
    {
        $this->discussionService->open(
            $project,
            $request->validated(),
            $request->user()->id
        );

        return back()->with('success', __('projects.messages.discussion_opened'));
    }

    public function destroy(Request $request, Project $project, ProjectDiscussion $discussion): RedirectResponse
    {
        if (! $request->user()->can('update', $project)) {
            abort(404);
        }

        $discussion->delete();

        return back()->with('success', __('projects.messages.discussion_deleted'));
    }

    /**
     * Reply to a discussion thread (POST projects/{project}/discussions/{discussion}/replies).
     */
    public function reply(StoreDiscussionReplyRequest $request, Project $project, ProjectDiscussion $discussion): RedirectResponse
    {
        $this->discussionService->reply(
            $discussion,
            $request->validated(),
            $request->user()->id
        );

        return back()->with('success', __('projects.messages.reply_added'));
    }
}

<?php

namespace Modules\Projects\Http\Controllers\Projects;

use App\Http\Controllers\Controller;
use Modules\Projects\Http\Requests\Projects\UploadProjectFileRequest;
use Modules\Projects\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Modules\Shared\Models\Attachment;
use Modules\Shared\Services\AttachmentService;
use Modules\Shared\Support\Activity\ActivityLogger;

/**
 * P08 — File upload / delete for projects (via P03 AttachmentService).
 * visible_to_customer defaults to false.
 */
class ProjectFileController extends Controller
{
    public function __construct(
        private readonly AttachmentService $attachmentService,
        private readonly ActivityLogger $activityLogger,
    ) {}

    public function store(UploadProjectFileRequest $request, Project $project): RedirectResponse
    {
        $validated = $request->validated();

        /** @var UploadedFile $file */
        $file = $request->file('file');

        $attachment = $this->attachmentService->store(
            $project,
            $file,
            (bool) ($validated['visible_to_customer'] ?? false)
        );

        $this->activityLogger->log($project, 'project_file_uploaded', [
            'attachment_id' => $attachment->id,
            'file_name' => $attachment->file_name ?? $attachment->path,
        ]);

        return back()->with('success', __('projects.messages.file_uploaded'));
    }

    public function destroy(Request $request, Project $project, Attachment $attachment): RedirectResponse
    {
        if (! $request->user()->can('update', $project)) {
            abort(404);
        }

        // Ensure attachment belongs to this project
        if ($attachment->attachable_type !== 'project' || $attachment->attachable_id !== $project->id) {
            abort(404);
        }

        $this->attachmentService->delete($attachment);

        return back()->with('success', __('projects.messages.file_deleted'));
    }
}

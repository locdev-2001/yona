<?php

namespace Modules\Projects\Http\Requests\Projects;

use Modules\Projects\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * P08 — Validate status change. status_id must be workspace-scoped project_status.
 */
class ChangeProjectStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && $this->user()?->can('update', $project);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'status_id' => [
                'required',
                'uuid',
                Rule::exists('project_statuses', 'id')->where('workspace_id', currentWorkspace()?->id),
            ],
        ];
    }
}

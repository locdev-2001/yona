<?php

namespace Modules\Projects\Http\Requests\Projects;

use Modules\Projects\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * P08 — Validate + authorize updating a project.
 * G2: uses Policy::update gate (tenant.project.update).
 */
class UpdateProjectRequest extends FormRequest
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
            'name' => ['sometimes', 'required', 'string', 'max:191'],
            'description' => ['nullable', 'string', 'max:65535'],
            'client_id' => [
                'sometimes',
                'required',
                'uuid',
                Rule::exists('clients', 'id')->where('workspace_id', currentWorkspace()?->id),
            ],
            'billing_type' => ['nullable', 'integer', Rule::in([
                Project::BILLING_FIXED,
                Project::BILLING_HOURLY,
                Project::BILLING_NON_BILLABLE,
            ])],
            'start_date' => ['nullable', 'date'],
            'deadline' => ['nullable', 'date', 'after_or_equal:start_date'],
            'progress' => ['nullable', 'integer', 'min:0', 'max:100'],
            'progress_from_tasks' => ['nullable', 'boolean'],
            'visible_to_customer' => ['nullable', 'boolean'],
            'custom_fields' => ['nullable', 'array'],
        ];
    }
}

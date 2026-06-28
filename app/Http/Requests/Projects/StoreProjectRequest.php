<?php

namespace App\Http\Requests\Projects;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * P08 — Validate + authorize creating a new project.
 * G2: uses tenant.project.create permission.
 * G12: NEVER accepts workspace_id / owner_id / status_id / project_number from request on create.
 */
class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('tenant.project.create') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $workspace = currentWorkspace();

        $rules = [
            'name' => ['required', 'string', 'max:191'],
            'description' => ['nullable', 'string', 'max:65535'],
            'client_id' => [
                'required',
                'uuid',
                Rule::exists('clients', 'id')->where('workspace_id', $workspace?->id),
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
        ];

        // custom_fields bag validated via CustomFieldService::validate() in controller (P02 pattern)
        $rules['custom_fields'] = ['nullable', 'array'];

        return $rules;
    }
}

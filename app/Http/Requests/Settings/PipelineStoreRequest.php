<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validate pipeline creation. Authz: admin-only via tenant.workspace.update.
 * name uniqueness scoped to workspace (RLS-filtered unique check).
 */
class PipelineStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('tenant.workspace.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('pipelines')->where('workspace_id', currentWorkspace()->id)->whereNull('deleted_at'),
            ],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}

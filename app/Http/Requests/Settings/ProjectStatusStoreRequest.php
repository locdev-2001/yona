<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProjectStatusStoreRequest extends FormRequest
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
                Rule::unique('project_statuses')
                    ->where('workspace_id', currentWorkspace()->id)
                    ->whereNull('deleted_at'),
            ],
            'color' => ['nullable', 'string', 'max:9'],
            'status_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}

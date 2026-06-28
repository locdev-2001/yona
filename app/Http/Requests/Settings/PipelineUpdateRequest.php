<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validate pipeline update. Ignores self in unique check.
 */
class PipelineUpdateRequest extends FormRequest
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
        $pipelineId = $this->route('pipeline')?->id;

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('pipelines')
                    ->where('workspace_id', currentWorkspace()->id)
                    ->whereNull('deleted_at')
                    ->ignore($pipelineId),
            ],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}

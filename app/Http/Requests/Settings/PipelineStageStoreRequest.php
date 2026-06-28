<?php

namespace App\Http\Requests\Settings;

use App\Models\PipelineStage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validate stage creation within a pipeline.
 */
class PipelineStageStoreRequest extends FormRequest
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
        $pipeline = $this->route('pipeline');

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('pipeline_stages')
                    ->where('workspace_id', currentWorkspace()->id)
                    ->where('pipeline_id', $pipeline?->id)
                    ->whereNull('deleted_at'),
            ],
            'color' => ['nullable', 'string', 'max:9'],
            'stage_order' => ['sometimes', 'integer', 'min:0'],
            'probability' => ['sometimes', 'integer', 'between:0,100'],
            'type' => ['required', Rule::in(PipelineStage::STAGE_TYPES)],
        ];
    }
}

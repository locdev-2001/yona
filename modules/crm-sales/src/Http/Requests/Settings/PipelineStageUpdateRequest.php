<?php

namespace Modules\CrmSales\Http\Requests\Settings;

use Modules\CrmSales\Models\PipelineStage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validate stage update. Unique name ignores self within the same pipeline.
 */
class PipelineStageUpdateRequest extends FormRequest
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
        /** @var PipelineStage $stage */
        $stage = $this->route('stage');

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('pipeline_stages')
                    ->where('workspace_id', currentWorkspace()->id)
                    ->where('pipeline_id', $stage->pipeline_id)
                    ->whereNull('deleted_at')
                    ->ignore($stage->id),
            ],
            'color' => ['nullable', 'string', 'max:9'],
            'stage_order' => ['sometimes', 'integer', 'min:0'],
            'probability' => ['sometimes', 'integer', 'between:0,100'],
            'type' => ['required', Rule::in(PipelineStage::STAGE_TYPES)],
        ];
    }
}


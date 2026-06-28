<?php

namespace App\Http\Requests\Leads;

use App\Models\Lead;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * P07 — Validate kanban stage move.
 * G8 — stage_id MUST belong to the lead's current pipeline (not another pipeline).
 */
class MoveLeadStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        $lead = $this->route('lead');

        if (! ($lead instanceof Lead)) {
            return false;
        }

        return $this->user()?->can('update', $lead) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Lead $lead */
        $lead = $this->route('lead');
        $workspace = currentWorkspace();

        return [
            // G8: stage must belong to the lead's current pipeline
            'stage_id' => [
                'required',
                'uuid',
                Rule::exists('pipeline_stages', 'id')
                    ->where('pipeline_id', $lead->pipeline_id)
                    ->where('workspace_id', $workspace?->id),
            ],
            'order' => ['required', 'integer', 'min:0'],
        ];
    }
}

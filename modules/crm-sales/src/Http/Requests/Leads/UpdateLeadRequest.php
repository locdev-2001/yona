<?php

namespace Modules\CrmSales\Http\Requests\Leads;

use Modules\CrmSales\Models\Lead;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * P07 — Validate + authorize updating a lead.
 * G2 — tenant.lead.update permission + Policy record-level check.
 * G8 — stage_id must belong to the submitted pipeline_id (or current pipeline if not changing).
 */
class UpdateLeadRequest extends FormRequest
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
        $workspace = currentWorkspace();
        /** @var Lead $lead */
        $lead = $this->route('lead');
        $pipelineId = $this->input('pipeline_id', $lead->pipeline_id);

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'title' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'company' => ['nullable', 'string', 'max:255'],
            'lead_value' => ['nullable', 'numeric', 'min:0', 'max:999999999999999'],
            'website' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],

            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'zip' => ['nullable', 'string', 'max:20'],
            'country' => ['nullable', 'string', 'max:100'],

            'pipeline_id' => [
                'sometimes',
                'required',
                'uuid',
                Rule::exists('pipelines', 'id')->where('workspace_id', $workspace?->id),
            ],

            // G8: stage must belong to pipeline
            'stage_id' => [
                'sometimes',
                'required',
                'uuid',
                Rule::exists('pipeline_stages', 'id')
                    ->where('pipeline_id', $pipelineId)
                    ->where('workspace_id', $workspace?->id),
            ],

            'source_id' => [
                'nullable',
                'uuid',
                Rule::exists('lead_sources', 'id')->where('workspace_id', $workspace?->id),
            ],

            'assigned_to' => [
                'nullable',
                'integer',
                Rule::exists('workspace_member', 'user_id')->where('workspace_id', $workspace?->id)->where('status', 'active'),
            ],

            'is_public' => ['nullable', 'boolean'],

            'custom_fields' => ['nullable', 'array'],
        ];
    }
}


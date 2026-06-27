<?php

namespace App\Http\Requests\Leads;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Shared\Services\CustomFieldService;

/**
 * P07 — Validate + authorize creating a new lead.
 * G2 — tenant.lead.create permission.
 * G8 — stage_id must belong to the submitted pipeline_id (scoped to workspace).
 * G12 — NEVER accepts workspace_id/owner_id/lead_number from request.
 */
class StoreLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('tenant.lead.create') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $workspace = currentWorkspace();
        $pipelineId = $this->input('pipeline_id');

        return [
            // Core fields
            'name' => ['required', 'string', 'max:255'],
            'title' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'company' => ['nullable', 'string', 'max:255'],
            'lead_value' => ['nullable', 'numeric', 'min:0', 'max:999999999999999'],
            'website' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],

            // Address
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'zip' => ['nullable', 'string', 'max:20'],
            'country' => ['nullable', 'string', 'max:100'],

            // Pipeline (G8: stage must belong to pipeline)
            'pipeline_id' => [
                'required',
                'uuid',
                Rule::exists('pipelines', 'id')->where('workspace_id', $workspace?->id),
            ],
            'stage_id' => [
                'required',
                'uuid',
                Rule::exists('pipeline_stages', 'id')
                    ->where('pipeline_id', $pipelineId)
                    ->where('workspace_id', $workspace?->id),
            ],

            // Source (optional lookup)
            'source_id' => [
                'nullable',
                'uuid',
                Rule::exists('lead_sources', 'id')->where('workspace_id', $workspace?->id),
            ],

            // Assignment
            'assigned_to' => [
                'nullable',
                'integer',
                Rule::exists('workspace_member', 'user_id')->where('workspace_id', $workspace?->id)->where('status', 'active'),
            ],

            // Visibility
            'is_public' => ['nullable', 'boolean'],

            // Custom fields (validated by CustomFieldService)
            'custom_fields' => ['nullable', 'array'],
        ];
    }
}

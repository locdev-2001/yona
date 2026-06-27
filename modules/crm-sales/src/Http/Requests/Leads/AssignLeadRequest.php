<?php

namespace Modules\CrmSales\Http\Requests\Leads;

use Modules\CrmSales\Models\Lead;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * P07 — Validate lead assignment.
 * assigned_to nullable: null means unassign.
 */
class AssignLeadRequest extends FormRequest
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

        return [
            'assigned_to' => [
                'nullable',
                'integer',
                Rule::exists('workspace_member', 'user_id')
                    ->where('workspace_id', $workspace?->id)
                    ->where('status', 'active'),
            ],
        ];
    }
}


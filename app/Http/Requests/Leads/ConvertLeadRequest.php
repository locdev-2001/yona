<?php

namespace App\Http\Requests\Leads;

use App\Models\Lead;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * P07 — Validate + authorize lead conversion (G7).
 * Requires: tenant.lead.update AND tenant.client.create.
 * Route-bound lead must belong to currentWorkspace (global scope enforces this).
 * client_id (optional): attach-existing, scoped to current workspace.
 */
class ConvertLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        $lead = $this->route('lead');

        if (! ($lead instanceof Lead)) {
            return false;
        }

        return $this->user()?->can('convert', $lead) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $workspace = currentWorkspace();

        return [
            // Optional: attach to existing client (workspace-scoped G7)
            'client_id' => [
                'nullable',
                'uuid',
                Rule::exists('clients', 'id')->where('workspace_id', $workspace?->id),
            ],

            // Optional overrides for client/contact creation
            'client_name' => ['nullable', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
        ];
    }
}

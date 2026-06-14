<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates workspace-settings edits. Admin-gated via the tenant.workspace.update
 * permission (scoped to the active workspace). Server-controlled fields
 * (workspace_id, status, slug) are not editable here (BR-X12).
 */
class WorkspaceUpdateRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'base_currency' => ['required', Rule::in(['VND', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD'])],
            'timezone' => ['required', 'string', Rule::in(timezone_identifiers_list())],
            'locale' => ['required', Rule::in(['vi', 'en'])],
            'audit_retention' => ['required', Rule::in(['30d', '90d', '1y', 'forever'])],
        ];
    }
}

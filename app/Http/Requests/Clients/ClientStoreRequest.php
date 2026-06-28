<?php

namespace App\Http\Requests\Clients;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validate + authorize creating a new client.
 * G2 — uses tenant.client.create permission.
 * G12 — NEVER accepts workspace_id / owner_id / portal cols from request.
 */
class ClientStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('tenant.client.create') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $workspace = currentWorkspace();

        return [
            // Core client fields
            'name' => ['required', 'string', 'max:255'],
            'vat' => ['nullable', 'string', 'max:50'],
            'phone' => ['nullable', 'string', 'max:50'],
            'website' => ['nullable', 'string', 'max:255'],
            'currency' => ['nullable', 'string', 'max:8'],
            'default_language' => ['nullable', 'string', Rule::in(['vi', 'en'])], // G1 — no ja

            // Billing address
            'billing_street' => ['nullable', 'string', 'max:255'],
            'billing_city' => ['nullable', 'string', 'max:100'],
            'billing_state' => ['nullable', 'string', 'max:100'],
            'billing_zip' => ['nullable', 'string', 'max:20'],
            'billing_country' => ['nullable', 'string', 'max:100'],

            // Shipping address
            'shipping_street' => ['nullable', 'string', 'max:255'],
            'shipping_city' => ['nullable', 'string', 'max:100'],
            'shipping_state' => ['nullable', 'string', 'max:100'],
            'shipping_zip' => ['nullable', 'string', 'max:20'],
            'shipping_country' => ['nullable', 'string', 'max:100'],

            // Group assignments (validated against workspace-scoped groups)
            'groups' => ['nullable', 'array'],
            'groups.*' => ['uuid', Rule::exists('client_groups', 'id')->where('workspace_id', $workspace?->id)],

            // Primary contact (optional nested object)
            'primary_contact' => ['nullable', 'array'],
            'primary_contact.first_name' => ['required_with:primary_contact', 'string', 'max:100'],
            'primary_contact.last_name' => ['nullable', 'string', 'max:100'],
            'primary_contact.email' => [
                'nullable',
                'email',
                'max:255',
                // Partial unique per workspace (G10) — exclude soft-deleted rows
                Rule::unique('contacts', 'email')
                    ->where('workspace_id', $workspace?->id)
                    ->whereNull('deleted_at'),
            ],
            'primary_contact.phone' => ['nullable', 'string', 'max:50'],
            'primary_contact.title' => ['nullable', 'string', 'max:150'],
            'primary_contact.language' => ['nullable', 'string', Rule::in(['vi', 'en'])],

            // Custom fields bag (split client/contact in controller)
            'custom_fields' => ['nullable', 'array'],
            'custom_fields.client' => ['nullable', 'array'],
            'custom_fields.contact' => ['nullable', 'array'],
        ];
    }
}

<?php

namespace Modules\CrmSales\Http\Requests\Clients;

use Modules\CrmSales\Models\Client;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validate + authorize adding a contact to a client.
 * G10 — email partial unique index (workspace-scoped, excludes soft-deleted).
 * G12 — NEVER accepts portal cols (password, is_active, email_verified_at).
 */
class ContactStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        $client = $this->route('client');

        return $client instanceof Client
            ? $this->user()?->can('update', $client) ?? false
            : ($this->user()?->can('tenant.contact.create') ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $workspace = currentWorkspace(); // G12 — never from request

        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'email' => [
                'nullable',
                'email',
                'max:255',
                // G10 — workspace-scoped partial unique (matches DB partial index)
                Rule::unique('contacts', 'email')
                    ->where('workspace_id', $workspace?->id)
                    ->whereNull('deleted_at'),
            ],
            'phone' => ['nullable', 'string', 'max:50'],
            'title' => ['nullable', 'string', 'max:150'],
            'language' => ['nullable', 'string', Rule::in(['vi', 'en'])], // G1 — no ja
            'make_primary' => ['nullable', 'boolean'],

            // Custom fields for this contact
            'custom_fields' => ['nullable', 'array'],
        ];
    }
}


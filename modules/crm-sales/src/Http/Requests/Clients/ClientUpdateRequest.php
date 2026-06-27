<?php

namespace Modules\CrmSales\Http\Requests\Clients;

use Modules\CrmSales\Models\Client;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validate + authorize updating a client.
 * G2 — policy check is done via controller authorize(); request only checks capability.
 */
class ClientUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $client = $this->route('client');

        return $client instanceof Client
            ? $this->user()?->can('update', $client) ?? false
            : false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'vat' => ['nullable', 'string', 'max:50'],
            'phone' => ['nullable', 'string', 'max:50'],
            'website' => ['nullable', 'string', 'max:255'],
            'currency' => ['nullable', 'string', 'max:8'],
            'default_language' => ['nullable', 'string', Rule::in(['vi', 'en'])],

            'billing_street' => ['nullable', 'string', 'max:255'],
            'billing_city' => ['nullable', 'string', 'max:100'],
            'billing_state' => ['nullable', 'string', 'max:100'],
            'billing_zip' => ['nullable', 'string', 'max:20'],
            'billing_country' => ['nullable', 'string', 'max:100'],

            'shipping_street' => ['nullable', 'string', 'max:255'],
            'shipping_city' => ['nullable', 'string', 'max:100'],
            'shipping_state' => ['nullable', 'string', 'max:100'],
            'shipping_zip' => ['nullable', 'string', 'max:20'],
            'shipping_country' => ['nullable', 'string', 'max:100'],

            'groups' => ['nullable', 'array'],
            'groups.*' => ['uuid', Rule::exists('client_groups', 'id')->where('workspace_id', currentWorkspace()?->id)],

            'custom_fields' => ['nullable', 'array'],
        ];
    }
}


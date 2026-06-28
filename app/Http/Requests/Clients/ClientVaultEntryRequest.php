<?php

namespace App\Http\Requests\Clients;

use App\Models\Client;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validate + authorize storing/updating a vault entry.
 */
class ClientVaultEntryRequest extends FormRequest
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
            'server_address' => ['nullable', 'string', 'max:255'],
            'port' => ['nullable', 'string', 'max:10'],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string', 'max:2000'],
            'share_in_projects' => ['nullable', 'boolean'],
            'visibility' => ['nullable', 'string', Rule::in(['private', 'shared'])],
        ];
    }
}

<?php

namespace App\Http\Requests\Clients;

use App\Models\ClientGroup;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Validate + authorize creating / updating a client group.
 * Slug is auto-derived from name when not provided.
 */
class ClientGroupStoreRequest extends FormRequest
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
        $group = $this->route('client_group');
        $ignoreId = $group instanceof ClientGroup ? $group->id : null;

        return [
            'name' => ['required', 'string', 'max:150'],
            'slug' => [
                'nullable',
                'string',
                'max:150',
                Rule::unique('client_groups', 'slug')
                    ->where('workspace_id', $workspace?->id)
                    ->ignore($ignoreId),
            ],
        ];
    }

    /**
     * Auto-generate slug from name if not supplied.
     *
     * @return array<string, mixed>
     */
    public function validated($key = null, $default = null): mixed
    {
        $data = parent::validated($key, $default);

        if (is_array($data) && empty($data['slug']) && ! empty($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        return $data;
    }
}

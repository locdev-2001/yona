<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Create a team. parent_id, if given, must be an existing in-workspace team —
 * the exists() query runs as the RLS-scoped app role, so a cross-workspace id
 * resolves to nothing (BR-X11).
 */
class TeamStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('team.manage') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'uuid', Rule::exists('teams', 'id')->whereNull('deleted_at')],
        ];
    }
}

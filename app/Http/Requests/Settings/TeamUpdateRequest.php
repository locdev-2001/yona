<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Rename a team. (Re-parenting is a separate, cycle-guarded endpoint.)
 */
class TeamUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('tenant.team.manage') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // Unique per workspace (RLS-scoped), ignoring this team itself.
            'name' => ['required', 'string', 'max:255', Rule::unique('teams', 'name')->ignore($this->route('team'))->whereNull('deleted_at')],
        ];
    }
}

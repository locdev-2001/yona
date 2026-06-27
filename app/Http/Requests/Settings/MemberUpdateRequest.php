<?php

namespace App\Http\Requests\Settings;

use Modules\Tenancy\Models\WorkspaceMember;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Update a member's role and/or team. Server-controlled (BR-X12); the
 * controller additionally blocks editing one's own membership.
 */
class MemberUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('tenant.member.manage') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'role' => ['required', Rule::in(WorkspaceMember::ROLES)],
            'team_id' => ['nullable', 'uuid', Rule::exists('teams', 'id')->whereNull('deleted_at')],
        ];
    }
}

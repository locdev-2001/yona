<?php

namespace App\Http\Requests\Settings;

use App\Models\WorkspaceMember;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Invite a member. role + team are validated but applied by MembershipService
 * (server-controlled, BR-X12). team_id must be an in-workspace team (RLS-scoped
 * exists). Email may belong to a brand-new or existing global user.
 */
class MemberInviteRequest extends FormRequest
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
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', Rule::in(WorkspaceMember::ROLES)],
            'team_id' => ['nullable', 'uuid', Rule::exists('teams', 'id')->whereNull('deleted_at')],
        ];
    }
}

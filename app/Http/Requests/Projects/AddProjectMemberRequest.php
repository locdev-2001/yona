<?php

namespace App\Http\Requests\Projects;

use App\Models\Project;
use App\Models\WorkspaceMember;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * P08 — Validate add project member.
 * G12 layer 1: user_id must be active WorkspaceMember (FormRequest is defense-in-depth;
 * ProjectService::addMember() is single source of truth for the active-member assert).
 * G2: manageMembers gate mapped to tenant.project.update permission.
 */
class AddProjectMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && $this->user()?->can('update', $project);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $workspaceId = currentWorkspace()?->id;

        return [
            'user_id' => [
                'required',
                'integer',
                // G12 defense-in-depth: must be an active workspace_member
                Rule::exists('workspace_member', 'user_id')
                    ->where('workspace_id', $workspaceId)
                    ->where('status', 'active'),
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'user_id.exists' => __('projects.validation.member_not_active_workspace_member'),
        ];
    }
}

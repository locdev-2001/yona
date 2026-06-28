<?php

namespace App\Http\Requests\Projects;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;

/**
 * P08 — Validate creating / updating a milestone.
 */
class StoreProjectMilestoneRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && $this->user()?->can('update', $project);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:191'],
            'color' => ['nullable', 'string', 'max:20'],
            'due_date' => ['nullable', 'date'],
            'description' => ['nullable', 'string', 'max:65535'],
        ];
    }
}

<?php

namespace Modules\Projects\Http\Requests\Projects;

use Modules\Projects\Models\Project;
use Illuminate\Foundation\Http\FormRequest;

/**
 * P08 — Validate creating a discussion thread.
 */
class StoreProjectDiscussionRequest extends FormRequest
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
            'subject' => ['required', 'string', 'max:191'],
            'body' => ['nullable', 'string', 'max:65535'],
            'show_to_customer' => ['nullable', 'boolean'],
        ];
    }
}

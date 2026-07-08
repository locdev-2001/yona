<?php

namespace App\Http\Requests\Projects;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;

/**
 * P08 — Validate file upload to a project (via P03 AttachmentService).
 */
class UploadProjectFileRequest extends FormRequest
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
            'file' => ['required', 'file', 'max:20480'], // 20 MB max
            'visible_to_customer' => ['nullable', 'boolean'],
            'external_link' => ['nullable', 'url', 'max:2048'],
        ];
    }
}

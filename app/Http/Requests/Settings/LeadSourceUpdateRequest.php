<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LeadSourceUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('tenant.workspace.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $sourceId = $this->route('lead_source')?->id;

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('lead_sources')
                    ->where('workspace_id', currentWorkspace()->id)
                    ->whereNull('deleted_at')
                    ->ignore($sourceId),
            ],
        ];
    }
}


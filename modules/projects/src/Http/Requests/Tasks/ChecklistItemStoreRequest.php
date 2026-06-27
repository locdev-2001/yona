<?php

namespace Modules\Projects\Http\Requests\Tasks;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validate checklist item creation.
 * G12: assigned_user_id active-member guard in TaskService, not here.
 */
class ChecklistItemStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        $task = $this->route('task');

        return $task && $this->user()?->can('update', $task);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'description' => ['required', 'string', 'max:255'],
            'assigned_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
        ];
    }
}

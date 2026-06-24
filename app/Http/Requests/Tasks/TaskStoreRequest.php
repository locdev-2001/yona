<?php

namespace App\Http\Requests\Tasks;

use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validate task creation. G2: authorize via tenant.task.create.
 * G12: related_type/related_id consistency validated here;
 *       assignee active-member guard in TaskService (not just exists:users).
 */
class TaskStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('tenant.task.create') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'priority' => ['nullable', 'integer', Rule::in(Task::PRIORITIES)],
            'start_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'related_type' => ['nullable', 'string', Rule::in(Task::RELATED_TYPES)],
            'related_id' => ['nullable', 'uuid', 'required_with:related_type'],
            'milestone_id' => ['nullable', 'uuid', Rule::exists('project_milestones', 'id')],
            'assignee_ids' => ['nullable', 'array'],
            'assignee_ids.*' => ['integer', Rule::exists('users', 'id')],
            'billable' => ['nullable', 'boolean'],
            'hourly_rate' => ['nullable', 'numeric', 'min:0'],
            'visible_to_customer' => ['nullable', 'boolean'],
            'custom_fields' => ['nullable', 'array'],
        ];
    }
}

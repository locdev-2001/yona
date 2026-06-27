<?php

namespace Modules\Projects\Http\Requests\Tasks;

use Modules\Projects\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validate task update. Authorization via Policy (creator/assignee override).
 * lock_version required for optimistic concurrency (HasOptimisticLock).
 */
class TaskUpdateRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'priority' => ['nullable', 'integer', Rule::in(Task::PRIORITIES)],
            'start_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'related_type' => ['nullable', 'string', Rule::in(Task::RELATED_TYPES)],
            'related_id' => ['nullable', 'uuid', 'required_with:related_type'],
            'milestone_id' => ['nullable', 'uuid', Rule::exists('project_milestones', 'id')],
            'billable' => ['nullable', 'boolean'],
            'hourly_rate' => ['nullable', 'numeric', 'min:0'],
            'visible_to_customer' => ['nullable', 'boolean'],
            'custom_fields' => ['nullable', 'array'],
            'lock_version' => ['required', 'integer'],
        ];
    }
}

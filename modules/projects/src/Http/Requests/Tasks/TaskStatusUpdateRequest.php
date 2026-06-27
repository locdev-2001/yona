<?php

namespace Modules\Projects\Http\Requests\Tasks;

use Modules\Projects\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TaskStatusUpdateRequest extends FormRequest
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
            'status' => ['required', 'integer', Rule::in(Task::STATUSES)],
        ];
    }
}

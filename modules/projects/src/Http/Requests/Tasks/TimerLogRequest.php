<?php

namespace Modules\Projects\Http\Requests\Tasks;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validate manual timer log. G12: end_time after start_time (also guarded in service).
 */
class TimerLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        $task = $this->route('task');

        return $task && $this->user()?->can('logTime', $task);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'start_time' => ['required', 'date'],
            'end_time' => ['required', 'date', 'after:start_time'],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }
}

<?php

namespace App\Http\Requests\Reminders;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validate updating an existing reminder.
 * lock_version required for optimistic concurrency (BR-X08).
 * workspace_id, is_notified, user_id are server-controlled — never from request.
 */
class UpdateReminderRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Record-level authz handled by ReminderPolicy in the controller.
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'description' => ['required', 'string', 'max:1000'],
            'remind_at' => ['required', 'date', 'after:now'],
            'lock_version' => ['required', 'integer', 'min:0'],
        ];
    }
}

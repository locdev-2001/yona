<?php

namespace App\Http\Requests\Reminders;

use App\Models\Reminder;
use Modules\Tenancy\Models\WorkspaceMember;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validate creating a new reminder.
 * workspace_id is server-controlled — never accepted from request.
 * is_notified/notified_at are server-controlled — never accepted from request.
 */
class StoreReminderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Reminder::class);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $workspace = currentWorkspace();

        // Build list of active workspace member user IDs for recipient validation
        $activeMemberIds = $workspace
            ? WorkspaceMember::query()
                ->where('workspace_id', $workspace->id)
                ->where('status', 'active')
                ->pluck('user_id')
                ->all()
            : [];

        return [
            'remindable_type' => [
                'required',
                'string',
                Rule::in(array_keys(Relation::morphMap())),
            ],
            'remindable_id' => [
                'required',
                'uuid',
            ],
            'user_id' => [
                'required',
                'integer',
                Rule::in($activeMemberIds),
            ],
            'description' => ['required', 'string', 'max:1000'],
            'remind_at' => ['required', 'date', 'after:now'],
        ];
    }
}

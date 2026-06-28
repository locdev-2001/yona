<?php

namespace App\Http\Requests\Projects;

use App\Models\ProjectDiscussion;
use Illuminate\Foundation\Http\FormRequest;

/**
 * P08 — Validate a reply to a discussion thread.
 */
class StoreDiscussionReplyRequest extends FormRequest
{
    public function authorize(): bool
    {
        $discussion = $this->route('discussion');

        if (! $discussion instanceof ProjectDiscussion) {
            return false;
        }

        // Any user who can view the project may reply
        return $this->user()?->can('view', $discussion->project) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:65535'],
            'parent_id' => ['nullable', 'uuid', 'exists:comments,id'],
        ];
    }
}

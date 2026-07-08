<?php

namespace App\Http\Requests;

use App\Models\Comment;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates creating a new comment (top-level or reply).
 * commentable_type must be a registered morph alias (not just ENTITY_TYPES —
 * team is also a valid commentable for testing and future use).
 * parent_id existence is scoped to the active workspace.
 */
class StoreCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Comment::class);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'commentable_type' => ['required', 'string', Rule::in(array_keys(Relation::morphMap()))],
            'commentable_id' => ['required', 'uuid'],
            'body' => ['required', 'string', 'max:10000'],
            'parent_id' => [
                'nullable',
                'uuid',
                Rule::exists('comments', 'id')->whereNull('deleted_at'),
            ],
            'visible_to_customer' => ['sometimes', 'boolean'],
        ];
    }
}

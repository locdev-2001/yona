<?php

namespace App\Http\Requests;

use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Enums\TenantPermission;

/**
 * Validates a tag sync request for a specific entity.
 * Entity must be in the active workspace (resolved by global scope + RLS).
 */
class SyncTagsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(TenantPermission::TagsManage->value) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'attachable_type' => ['required', 'string', Rule::in(array_keys(Relation::morphMap()))],
            'attachable_id' => ['required', 'uuid'],
            'tags' => ['present', 'array'],
            'tags.*' => ['string', 'max:50'],
        ];
    }
}

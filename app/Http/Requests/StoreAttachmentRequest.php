<?php

namespace App\Http\Requests;

use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\Attachment;

/**
 * Validates an attachment upload. attachable_type must be a known morph alias;
 * attachable_id is resolved in authorize() to confirm workspace ownership.
 */
class StoreAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $type = $this->string('attachable_type')->toString();
        $id = $this->string('attachable_id')->toString();

        if (! array_key_exists($type, Relation::morphMap())) {
            return false;
        }

        // Resolve parent and confirm it belongs to the active workspace.
        // morphMap alias → FQCN via Relation::getMorphedModel().
        $modelClass = Relation::getMorphedModel($type);
        if (! $modelClass) {
            return false;
        }

        $parent = $modelClass::find($id);
        if (! $parent) {
            return false; // controller will abort(404) after authorize
        }

        return $this->user()->can('create', [Attachment::class, $parent]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:20480'], // 20 MB max
            'attachable_type' => ['required', 'string', Rule::in(array_keys(Relation::morphMap()))],
            'attachable_id' => ['required', 'uuid'],
            'visible_to_customer' => ['sometimes', 'boolean'],
        ];
    }
}

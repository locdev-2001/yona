<?php

namespace App\Http\Requests;

use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\Note;

/**
 * Validates creating a new note.
 * noteable_type must be a registered morph alias.
 */
class StoreNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Note::class);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'noteable_type' => ['required', 'string', Rule::in(array_keys(Relation::morphMap()))],
            'noteable_id' => ['required', 'uuid'],
            'body' => ['required', 'string', 'max:10000'],
            'date_contacted' => ['nullable', 'date'],
        ];
    }
}

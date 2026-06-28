<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Note;

/**
 * Validates editing an existing note. Authorization checks authorship via NotePolicy.
 */
class UpdateNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Note $note */
        $note = $this->route('note');

        return $this->user()->can('update', $note);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:10000'],
            'date_contacted' => ['nullable', 'date'],
        ];
    }
}

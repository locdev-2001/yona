<?php

namespace App\Http\Requests\Clients;

use App\Models\Contact;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validate + authorize updating a contact.
 * G10 — email unique ignores the current contact row (->ignore).
 */
class ContactUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $contact = $this->route('contact');

        return $contact instanceof Contact
            ? $this->user()?->can('update', $contact) ?? false
            : false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $contact = $this->route('contact');
        $workspace = currentWorkspace();

        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('contacts', 'email')
                    ->where('workspace_id', $workspace?->id)
                    ->whereNull('deleted_at')
                    ->ignore($contact instanceof Contact ? $contact->id : null, 'id'),
            ],
            'phone' => ['nullable', 'string', 'max:50'],
            'title' => ['nullable', 'string', 'max:150'],
            'language' => ['nullable', 'string', Rule::in(['vi', 'en'])],
            'make_primary' => ['nullable', 'boolean'],

            'custom_fields' => ['nullable', 'array'],
        ];
    }
}

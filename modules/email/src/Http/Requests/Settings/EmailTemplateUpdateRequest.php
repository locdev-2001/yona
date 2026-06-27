<?php

namespace Modules\Email\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

/**
 * P06 — Validate content edits for an existing email template.
 *
 * slug / type / language are server-controlled — never validated here.
 * Admin cannot change those; only content fields are allowed.
 */
class EmailTemplateUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('tenant.email_template.manage') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:50000'],
            'plaintext' => ['boolean'],
            'active' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
        ];
    }
}

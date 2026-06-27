<?php

namespace Modules\Email\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

/**
 * P06 — Validate send-test request for an email template.
 */
class EmailTemplateTestRequest extends FormRequest
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
            'email' => ['required', 'email', 'max:255'],
        ];
    }
}

<?php

namespace App\Http\Requests\Automation;

use App\Enums\TenantPermission;
use App\Http\Requests\Automation\Concerns\ValidatesWorkflowGraph;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreWorkflowRequest extends FormRequest
{
    use ValidatesWorkflowGraph;

    public function authorize(): bool
    {
        return $this->user()?->can(TenantPermission::AutomationManage->value) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            ...$this->graphRules(),
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(fn (Validator $v) => $this->validateGraphShape($v));
    }
}

<?php

namespace App\Http\Requests\Automation;

use App\Enums\TenantPermission;
use App\Http\Requests\Automation\Concerns\ValidatesWorkflowGraph;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateWorkflowRequest extends FormRequest
{
    use ValidatesWorkflowGraph;

    public function authorize(): bool
    {
        return $this->user()?->can(TenantPermission::AutomationManage->value) ?? false;
    }

    /**
     * A partial update (e.g. just toggling `is_active`) omits `graph`
     * entirely — every nested graph.* rule is prefixed `sometimes`, so it's
     * only enforced when the client actually sends that key. Replacing the
     * graph always means replacing the whole thing (a partial JSONB-field
     * patch doesn't make sense), so once `graph` is present, its own nested
     * keys are effectively required together.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $graphRules = $this->graphRules();

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            ...array_map(fn (array $rules) => ['sometimes', ...$rules], $graphRules),
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            if ($this->has('graph')) {
                $this->validateGraphShape($v);
            }
        });
    }
}

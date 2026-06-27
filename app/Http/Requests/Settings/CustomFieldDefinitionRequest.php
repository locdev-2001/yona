<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Shared\Models\CustomFieldDefinition;

/**
 * Shared FormRequest for create (POST) and update (PUT/PATCH) of custom-field
 * definitions. entity_type and field_type are only validated on create — both
 * become immutable after save (G6).
 */
class CustomFieldDefinitionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('custom_fields.manage') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $isCreate = $this->isMethod('post');
        $fieldType = $this->input('field_type');

        // On update, derive field_type from the route model to know if options are needed
        if (! $isCreate) {
            $definition = $this->route('definition');
            $fieldType = $definition instanceof CustomFieldDefinition ? $definition->field_type : $fieldType;
        }

        $optionTypes = CustomFieldDefinition::OPTION_TYPES;
        $requiresOptions = in_array($fieldType, $optionTypes, true);

        $rules = [
            'name' => ['required', 'string', 'max:150'],
            'options' => $requiresOptions
                ? ['required', 'array', 'min:1']
                : ['nullable', 'array'],
            'options.*' => ['string', 'distinct'],
            'default_value' => ['nullable'],
            'required' => ['boolean'],
            'active' => ['boolean'],
            'field_order' => ['integer', 'min:0'],
            'bs_column' => ['integer', 'between:1,12'],
            'show_on_table' => ['boolean'],
            'show_on_client_portal' => ['boolean'],
            'disallow_client_edit' => ['boolean'],
            'only_admin' => ['boolean'],
        ];

        if ($isCreate) {
            // entity_type and field_type are only accepted on create (immutable after)
            $rules['entity_type'] = ['required', 'string', Rule::in(CustomFieldDefinition::ENTITY_TYPES)];
            $rules['field_type'] = ['required', 'string', Rule::in(CustomFieldDefinition::FIELD_TYPES)];
        }

        return $rules;
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'options.required' => __('custom_fields.errors.option_required'),
            'options.min' => __('custom_fields.errors.option_required'),
            'entity_type.in' => __('custom_fields.errors.immutable'),
            'field_type.in' => __('custom_fields.errors.immutable'),
        ];
    }
}

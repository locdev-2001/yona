<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\CustomAttributeDefinition;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CustomAttributeDefinition> */
class CustomAttributeDefinitionFactory extends Factory
{
    protected $model = CustomAttributeDefinition::class;

    public function definition(): array
    {
        $sequence = $this->faker->unique()->numberBetween(1, 999999);

        return [
            'account_id' => Account::factory(),
            'attribute_display_name' => "Custom Attribute Definition {$sequence}",
            'attribute_key' => "custom_attribute_{$sequence}",
            'attribute_display_type' => 'number',
            'attribute_model' => CustomAttributeDefinition::MODEL_CONVERSATION,
            'default_value' => null,
        ];
    }
}

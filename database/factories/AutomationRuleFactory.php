<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\AutomationRule;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<AutomationRule> */
class AutomationRuleFactory extends Factory
{
    protected $model = AutomationRule::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'name' => fake()->sentence(3),
            'description' => fake()->sentence(),
            'event_name' => 'conversation_created',
            'conditions' => [[
                'attribute_key' => 'status',
                'filter_operator' => 'equal_to',
                'values' => ['open'],
                'query_operator' => null,
            ]],
            'actions' => [[
                'action_name' => 'resolve_conversation',
                'action_params' => [],
            ]],
            'active' => true,
        ];
    }
}

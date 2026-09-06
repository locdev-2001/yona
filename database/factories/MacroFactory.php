<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Macro;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Macro> */
class MacroFactory extends Factory
{
    protected $model = Macro::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'name' => $this->faker->words(3, true),
            'visibility' => 'personal',
            'actions' => [['action_name' => 'resolve_conversation', 'action_params' => []]],
        ];
    }

    public function global(): static
    {
        return $this->state(fn () => ['visibility' => 'global']);
    }
}

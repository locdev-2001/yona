<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\AiAgent;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<AiAgent> */
class AiAgentFactory extends Factory
{
    protected $model = AiAgent::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'name' => fake()->firstName(),
            'enabled' => true,
        ];
    }

    public function disabled(): static
    {
        return $this->state(['enabled' => false]);
    }
}

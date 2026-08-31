<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Team>
 */
class TeamFactory extends Factory
{
    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'name' => fake()->unique()->words(2, true),
            'description' => fake()->sentence(),
            'allow_auto_assign' => true,
        ];
    }
}

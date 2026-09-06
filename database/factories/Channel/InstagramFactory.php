<?php

namespace Database\Factories\Channel;

use App\Models\Account;
use App\Models\Channel\Instagram;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Instagram>
 */
class InstagramFactory extends Factory
{
    protected $model = Instagram::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'instagram_id' => (string) fake()->unique()->randomNumber(8, true),
            'access_token' => fake()->sha256(),
            'expires_at' => now()->addMonth(),
        ];
    }
}

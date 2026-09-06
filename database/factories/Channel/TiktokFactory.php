<?php

namespace Database\Factories\Channel;

use App\Models\Account;
use App\Models\Channel\Tiktok;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Tiktok>
 */
class TiktokFactory extends Factory
{
    protected $model = Tiktok::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'business_id' => (string) fake()->unique()->randomNumber(8, true),
            'access_token' => fake()->sha256(),
            'expires_at' => now()->addDay(),
            'refresh_token' => fake()->sha256(),
            'refresh_token_expires_at' => now()->addMonth(),
        ];
    }
}

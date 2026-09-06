<?php

namespace Database\Factories\Channel;

use App\Models\Account;
use App\Models\Channel\TwitterProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TwitterProfile>
 */
class TwitterProfileFactory extends Factory
{
    protected $model = TwitterProfile::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'profile_id' => (string) fake()->unique()->randomNumber(8, true),
            'twitter_access_token' => fake()->sha1(),
            'twitter_access_token_secret' => fake()->sha1(),
        ];
    }
}

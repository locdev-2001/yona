<?php

namespace Database\Factories\Channel;

use App\Models\Account;
use App\Models\Channel\FacebookPage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FacebookPage>
 */
class FacebookPageFactory extends Factory
{
    protected $model = FacebookPage::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'page_id' => (string) fake()->unique()->randomNumber(8, true),
            'user_access_token' => fake()->sha1(),
            'page_access_token' => fake()->sha1(),
        ];
    }
}

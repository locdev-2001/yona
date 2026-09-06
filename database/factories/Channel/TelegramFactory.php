<?php

namespace Database\Factories\Channel;

use App\Models\Account;
use App\Models\Channel\Telegram;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Telegram>
 */
class TelegramFactory extends Factory
{
    protected $model = Telegram::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'bot_token' => fake()->unique()->bothify('#########:??????????????????????'),
            'bot_name' => fake()->userName(),
        ];
    }
}

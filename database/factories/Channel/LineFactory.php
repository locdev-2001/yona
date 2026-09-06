<?php

namespace Database\Factories\Channel;

use App\Models\Account;
use App\Models\Channel\Line;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Line>
 */
class LineFactory extends Factory
{
    protected $model = Line::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'line_channel_id' => (string) fake()->unique()->randomNumber(8, true),
            'line_channel_secret' => fake()->sha1(),
            'line_channel_token' => fake()->sha256(),
        ];
    }
}

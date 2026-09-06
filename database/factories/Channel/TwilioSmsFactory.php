<?php

namespace Database\Factories\Channel;

use App\Models\Account;
use App\Models\Channel\TwilioSms;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TwilioSms>
 */
class TwilioSmsFactory extends Factory
{
    protected $model = TwilioSms::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'account_sid' => 'AC'.fake()->unique()->bothify('################################'),
            'auth_token' => fake()->sha1(),
            'phone_number' => '+1'.fake()->unique()->numerify('##########'),
            'medium' => TwilioSms::MEDIUM_SMS,
        ];
    }
}

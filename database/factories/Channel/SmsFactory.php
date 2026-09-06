<?php

namespace Database\Factories\Channel;

use App\Models\Account;
use App\Models\Channel\Sms;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Sms>
 */
class SmsFactory extends Factory
{
    protected $model = Sms::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'phone_number' => '+1'.fake()->unique()->numerify('##########'),
            'provider_config' => ['account_id' => 'acc', 'api_key' => 'key', 'api_secret' => 'secret', 'application_id' => 'app'],
        ];
    }
}

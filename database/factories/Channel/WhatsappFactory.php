<?php

namespace Database\Factories\Channel;

use App\Models\Account;
use App\Models\Channel\Whatsapp;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Whatsapp>
 */
class WhatsappFactory extends Factory
{
    protected $model = Whatsapp::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'phone_number' => '+1'.fake()->unique()->numerify('##########'),
            'provider' => 'whatsapp_cloud',
            'provider_config' => ['api_key' => 'test-key', 'phone_number_id' => '123456', 'business_account_id' => '654321'],
        ];
    }
}

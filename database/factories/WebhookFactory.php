<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Webhook;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Webhook> */
class WebhookFactory extends Factory
{
    protected $model = Webhook::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'url' => 'https://'.fake()->unique()->domainName().'/hook',
            'subscriptions' => ['conversation_status_changed'],
            'webhook_type' => Webhook::TYPE_ACCOUNT,
        ];
    }
}

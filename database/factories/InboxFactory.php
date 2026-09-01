<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Channel\Api;
use App\Models\Inbox;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Inbox>
 */
class InboxFactory extends Factory
{
    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'name' => fake()->company(),
        ];
    }

    // Factory :inbox của Chatwoot mặc định gắn kênh api cùng account.
    public function configure(): static
    {
        return $this->afterMaking(function (Inbox $inbox) {
            if ($inbox->channel_id === null) {
                $channel = Api::factory()->create(['account_id' => $inbox->account_id]);
                $inbox->channel_id = $channel->id;
                $inbox->channel_type = $channel->getMorphClass();
            }
        });
    }
}

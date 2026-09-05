<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Channel\Api;
use App\Models\Channel\WebWidget;
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

    // Factory :channel_widget của Chatwoot: kênh Website + inbox cùng account.
    public function webWidget(): static
    {
        return $this->state([
            'channel_type' => 'Channel::WebWidget',
            'channel_id' => fn (array $attributes) => WebWidget::factory()
                ->create(['account_id' => $attributes['account_id']])->id,
        ]);
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

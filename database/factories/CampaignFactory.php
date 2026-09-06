<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Campaign;
use App\Models\Inbox;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Campaign>
 */
class CampaignFactory extends Factory
{
    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'title' => fake()->unique()->sentence(3),
            'message' => fake()->unique()->sentence(6),
        ];
    }

    // Factory :campaign của Chatwoot tự sinh inbox kênh Website cùng account.
    public function configure(): static
    {
        return $this->afterMaking(function (Campaign $campaign) {
            if ($campaign->inbox_id === null) {
                $campaign->inbox_id = Inbox::factory()->webWidget()
                    ->create(['account_id' => $campaign->account_id])->id;
            }
        });
    }
}

<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\AgentBot;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<AgentBot> */
class AgentBotFactory extends Factory
{
    protected $model = AgentBot::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'name' => fake()->name(),
            'description' => fake()->sentence(),
            // TLD `.invalid` (RFC 2606) không bao giờ phân giải: bot giả trong test
            // không kéo theo lượt gọi Internet thật khi listener bắn webhook.
            'outgoing_url' => 'https://'.fake()->unique()->domainWord().'.invalid/bot',
            'bot_type' => AgentBot::TYPE_WEBHOOK,
            'bot_config' => [],
        ];
    }

    // System bot: không thuộc account nào, dùng chung cho mọi account.
    public function systemBot(): self
    {
        return $this->state(fn () => ['account_id' => null]);
    }
}

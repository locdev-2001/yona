<?php

namespace Database\Factories;

use App\Models\AgentBot;
use App\Models\AgentBotInbox;
use App\Models\Inbox;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<AgentBotInbox> */
class AgentBotInboxFactory extends Factory
{
    protected $model = AgentBotInbox::class;

    public function definition(): array
    {
        return [
            'agent_bot_id' => AgentBot::factory(),
            'inbox_id' => Inbox::factory(),
            'status' => AgentBotInbox::STATUS_ACTIVE,
        ];
    }
}

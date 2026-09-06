<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Conversation;
use App\Models\ReportingEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ReportingEvent> */
class ReportingEventFactory extends Factory
{
    protected $model = ReportingEvent::class;

    public function definition(): array
    {
        return [
            'name' => ReportingEvent::NAME_CONVERSATION_RESOLVED,
            'value' => 100,
            'value_in_business_hours' => 0,
            'account_id' => Account::factory(),
            'conversation_id' => Conversation::factory(),
        ];
    }

    public function forConversation(Conversation $conversation, array $attributes = []): self
    {
        return $this->state(fn () => array_replace([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
            'user_id' => $conversation->assignee_id,
        ], $attributes));
    }
}

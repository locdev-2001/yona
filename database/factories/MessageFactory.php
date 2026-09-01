<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Message>
 */
class MessageFactory extends Factory
{
    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'content' => 'Message content',
            'message_type' => Message::TYPE_INCOMING,
            'content_type' => Message::CONTENT_TYPES['text'],
        ];
    }

    public function outgoing(): static
    {
        return $this->state(['message_type' => Message::TYPE_OUTGOING]);
    }

    public function activity(): static
    {
        return $this->state(['message_type' => Message::TYPE_ACTIVITY]);
    }

    // Factory :message của Chatwoot tự sinh conversation cùng account.
    public function configure(): static
    {
        return $this->afterMaking(function (Message $message) {
            if ($message->conversation_id === null) {
                $message->conversation_id = Conversation::factory()->create([
                    'account_id' => $message->account_id,
                ])->id;
            }

            if ($message->inbox_id === null) {
                $message->inbox_id = $message->conversation->inbox_id;
            }
        });
    }
}

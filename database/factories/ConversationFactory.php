<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Conversation>
 */
class ConversationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'status' => Conversation::STATUS_OPEN,
        ];
    }

    // Factory :conversation tự sinh inbox/contact/contact_inbox
    // cùng account khi không truyền vào.
    public function configure(): static
    {
        return $this->afterMaking(function (Conversation $conversation) {
            if ($conversation->inbox_id === null) {
                $conversation->inbox_id = Inbox::factory()->create(['account_id' => $conversation->account_id])->id;
            }

            if ($conversation->contact_id === null) {
                $conversation->contact_id = Contact::factory()->create(['account_id' => $conversation->account_id])->id;
            }

            if ($conversation->contact_inbox_id === null) {
                $conversation->contact_inbox_id = ContactInbox::factory()->create([
                    'contact_id' => $conversation->contact_id,
                    'inbox_id' => $conversation->inbox_id,
                ])->id;
            }
        });
    }
}

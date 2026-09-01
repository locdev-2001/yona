<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Inbox;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ContactInbox>
 */
class ContactInboxFactory extends Factory
{
    public function definition(): array
    {
        return [
            'contact_id' => Contact::factory(),
            'inbox_id' => Inbox::factory(),
            'source_id' => (string) Str::uuid(),
        ];
    }
}

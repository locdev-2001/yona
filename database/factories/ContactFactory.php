<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Contact;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Contact>
 */
class ContactFactory extends Factory
{
    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'name' => fake()->name(),
        ];
    }

    // trait :with_email của factory Chatwoot.
    public function withEmail(): static
    {
        return $this->state(fn () => ['email' => fake()->unique()->safeEmail()]);
    }
}

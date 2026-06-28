<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Contact;
use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Workspace;

/**
 * @extends Factory<Contact>
 */
class ContactFactory extends Factory
{
    protected $model = Contact::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'client_id' => Client::factory(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->optional(0.6)->phoneNumber(),
            'title' => fake()->optional(0.4)->jobTitle(),
            'is_primary' => false, // service controls primary invariant
            'language' => fake()->randomElement(['vi', 'en', null]),
        ];
    }

    /** Mark as primary contact. */
    public function primary(): static
    {
        return $this->state(['is_primary' => true]);
    }

    /** Contact without email (portal login not applicable). */
    public function withoutEmail(): static
    {
        return $this->state(['email' => null]);
    }
}

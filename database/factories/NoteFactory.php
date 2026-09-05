<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Contact;
use App\Models\Note;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Note> */
class NoteFactory extends Factory
{
    protected $model = Note::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'contact_id' => Contact::factory(),
            'content' => $this->faker->sentence(),
        ];
    }
}

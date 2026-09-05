<?php

namespace Database\Factories;

use App\Models\Conversation;
use App\Models\Mention;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Mention> */
class MentionFactory extends Factory
{
    protected $model = Mention::class;

    public function definition(): array
    {
        return [
            'conversation_id' => Conversation::factory(),
            'user_id' => User::factory(),
            'mentioned_at' => now(),
        ];
    }
}

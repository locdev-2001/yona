<?php

namespace Database\Factories\Channel;

use App\Models\Account;
use App\Models\Channel\Email;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Email>
 */
class EmailFactory extends Factory
{
    protected $model = Email::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'email' => fake()->unique()->safeEmail(),
        ];
    }
}

<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AccountUser>
 */
class AccountUserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'user_id' => User::factory(),
            'role' => AccountUser::ROLE_AGENT,
        ];
    }

    public function administrator(): static
    {
        return $this->state(fn () => ['role' => AccountUser::ROLE_ADMINISTRATOR]);
    }
}

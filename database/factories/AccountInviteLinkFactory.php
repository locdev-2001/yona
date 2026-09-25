<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\AccountInviteLink;
use App\Models\AccountUser;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AccountInviteLink>
 */
class AccountInviteLinkFactory extends Factory
{
    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'created_by_id' => User::factory(),
            'role' => AccountUser::ROLE_AGENT,
            'token_digest' => AccountInviteLink::hashToken(AccountInviteLink::generateToken()),
            'expires_at' => now()->addDays(7),
            'max_uses' => null,
            'use_count' => 0,
        ];
    }

    public function administrator(): static
    {
        return $this->state(fn () => ['role' => AccountUser::ROLE_ADMINISTRATOR]);
    }

    public function revoked(): static
    {
        return $this->state(fn () => ['revoked_at' => now()]);
    }

    public function expired(): static
    {
        return $this->state(fn () => ['expires_at' => now()->subDay()]);
    }
}

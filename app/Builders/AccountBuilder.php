<?php

namespace App\Builders;

use App\Exceptions\Account\UserExists;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AccountBuilder
{
    private ?Account $account = null;

    public function __construct(
        private readonly ?string $accountName,
        private readonly string $email,
        private readonly ?string $userFullName = null,
        private readonly ?string $userPassword = null,
        private readonly bool $confirmed = false,
        private ?User $user = null,
        private readonly ?string $locale = null,
    ) {}

    /** @return array{0: User, 1: Account} */
    public function perform(): array
    {
        if ($this->user === null) {
            User::assertAllowedEmail($this->email);
            $this->validateUser();
        }

        return DB::transaction(function () {
            $this->account = $this->createAccount();
            $user = $this->createAndLinkUser();

            return [$user, $this->account];
        });
    }

    private function validateUser(): void
    {
        if (User::query()->where('email', mb_strtolower($this->email))->exists()) {
            throw new UserExists;
        }
    }

    private function createAccount(): Account
    {
        return Account::query()->create([
            'name' => $this->accountName ?: ($this->userFullName ?? ''),
            'locale' => $this->locale ?? config('app.locale'),
            'custom_attributes' => [Account::ONBOARDING_STEP_KEY => 'account_details'],
        ]);
    }

    private function createAndLinkUser(): User
    {
        $this->user ??= User::query()->create([
            'email' => $this->email,
            'password' => $this->userPassword,
            'name' => $this->userFullName ?? '',
            'confirmed_at' => $this->confirmed ? now() : null,
        ]);

        AccountUser::query()->create([
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'role' => AccountUser::ROLE_ADMINISTRATOR,
        ]);

        return $this->user;
    }
}

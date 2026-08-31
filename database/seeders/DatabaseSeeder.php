<?php

namespace Database\Seeders;

use App\Builders\AccountBuilder;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $existingUser = User::query()->where('email', 'john@acme.inc')->first();

        if ($existingUser && $existingUser->accounts()->exists()) {
            return;
        }

        [$user, $account] = (new AccountBuilder(
            accountName: 'Acme Inc',
            email: 'john@acme.inc',
            userFullName: 'John Kennedy',
            userPassword: 'Password1!',
            confirmed: true,
            user: $existingUser,
        ))->perform();

        $account->finishOnboarding();
    }
}

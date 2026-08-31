<?php

use App\Builders\AccountBuilder;
use App\Exceptions\Account\UserExists;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use Illuminate\Support\Facades\DB;

// Port từ refs/chatwoot/spec/builders/account_builder_spec.rb

function makeAccountBuilder(): AccountBuilder
{
    return new AccountBuilder(
        accountName: 'Test Account',
        email: 'user@example.com',
        userFullName: 'Test User',
        userPassword: 'Password123!',
        confirmed: true,
    );
}

describe('AccountBuilder perform', function () {
    it('creates a new account with correct name and onboarding step', function () {
        [, $account] = makeAccountBuilder()->perform();

        expect($account)->toBeInstanceOf(Account::class)
            ->and($account->name)->toBe('Test Account')
            ->and($account->custom_attributes['onboarding_step'])->toBe('account_details');
    });

    it('creates a new confirmed user with correct details', function () {
        [$user] = makeAccountBuilder()->perform();

        expect($user)->toBeInstanceOf(User::class)
            ->and($user->email)->toBe('user@example.com')
            ->and($user->name)->toBe('Test User')
            ->and($user->isConfirmed())->toBeTrue();
    });

    it('links user to account as administrator', function () {
        [$user, $account] = makeAccountBuilder()->perform();

        $accountUser = $user->accountUsers()->first();
        expect($accountUser->role)->toBe(AccountUser::ROLE_ADMINISTRATOR)
            ->and($user->accounts()->first()->id)->toBe($account->id);
    });

    it('increments the counts of models', function () {
        makeAccountBuilder()->perform();

        expect(Account::count())->toBe(1)
            ->and(User::count())->toBe(1)
            ->and(AccountUser::count())->toBe(1);
    });

    it('rejects an email that already has a user', function () {
        User::factory()->create(['email' => 'user@example.com']);

        makeAccountBuilder()->perform();
    })->throws(UserExists::class);

    it('creates per-account display_id sequences via trigger', function () {
        [, $account] = makeAccountBuilder()->perform();

        $sequences = DB::select(
            "SELECT relname FROM pg_class WHERE relkind = 'S' AND relname IN (?, ?)",
            ["conv_dpid_seq_{$account->id}", "camp_dpid_seq_{$account->id}"],
        );

        expect($sequences)->toHaveCount(2);
    });
});

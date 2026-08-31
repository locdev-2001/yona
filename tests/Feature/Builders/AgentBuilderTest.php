<?php

use App\Builders\AgentBuilder;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use App\Notifications\ConfirmationInstructions;
use Illuminate\Support\Facades\Notification;

// Port từ spec/builders/agent_builder_spec.rb.
// Bỏ: các context usage limit / email capacity (billing cloud/EE, không port).

function builderFor(Account $account, User $inviter, array $overrides = []): AgentBuilder
{
    return new AgentBuilder(...array_merge([
        'email' => 'test@example.com',
        'inviter' => $inviter,
        'account' => $account,
        'name' => 'Test User',
        'role' => 'agent',
        'availability' => 'offline',
        'autoOffline' => false,
    ], $overrides));
}

describe('AgentBuilder#perform', function () {
    beforeEach(function () {
        $this->account = Account::factory()->create();
        $this->inviter = User::factory()->create();
        AccountUser::factory()->create([
            'account_id' => $this->account->id,
            'user_id' => $this->inviter->id,
            'role' => AccountUser::ROLE_ADMINISTRATOR,
        ]);
    });

    it('creates a new user with account user when user does not exist', function () {
        Notification::fake();

        $agent = builderFor($this->account, $this->inviter)->perform();

        expect($agent)->toBeInstanceOf(User::class)
            ->and($agent->email)->toBe('test@example.com')
            ->and($agent->isConfirmed())->toBeFalse()
            ->and($agent->password)->not->toBe('');

        $membership = AccountUser::query()
            ->where(['account_id' => $this->account->id, 'user_id' => $agent->id])
            ->first();

        expect($membership->role)->toBe(AccountUser::ROLE_AGENT)
            ->and($membership->availability)->toBe(AccountUser::AVAILABILITY_OFFLINE)
            ->and($membership->auto_offline)->toBeFalse()
            ->and($membership->inviter_id)->toBe($this->inviter->id);

        Notification::assertSentTo($agent, ConfirmationInstructions::class);
    });

    it('does not create a new user or send confirmation when user exists', function () {
        Notification::fake();
        $existing = User::factory()->create(['email' => 'test@example.com']);

        $userCountBefore = User::count();
        $agent = builderFor($this->account, $this->inviter)->perform();

        expect(User::count())->toBe($userCountBefore)
            ->and($agent->id)->toBe($existing->id)
            ->and($existing->accountUsers()->where('account_id', $this->account->id)->exists())->toBeTrue();

        Notification::assertNothingSent();
    });

    it('leaves availability and auto_offline at table defaults when passed null', function () {
        Notification::fake();

        $agent = builderFor($this->account, $this->inviter, [
            'availability' => null,
            'autoOffline' => null,
        ])->perform();

        $membership = $agent->accountUsers()->first();

        expect($membership->availability)->toBe(AccountUser::AVAILABILITY_ONLINE)
            ->and($membership->auto_offline)->toBeTrue();
    });

    it('creates a user with default values when only email is provided', function () {
        Notification::fake();

        $agent = (new AgentBuilder(
            email: 'test@example.com',
            inviter: $this->inviter,
            account: $this->account,
        ))->perform();

        expect($agent->name)->toBe('test')
            ->and($agent->accountUsers()->first()->role)->toBe(AccountUser::ROLE_AGENT);
    });
});

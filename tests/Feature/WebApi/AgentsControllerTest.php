<?php

use App\Jobs\DeleteObjectJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use App\Notifications\ConfirmationInstructions;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;

// Port từ spec/controllers/api/v1/accounts/agents_controller_spec.rb.
// Bỏ: các context email limit / usage limit (billing cloud/EE, không port).

function agentsAccount(): Account
{
    return Account::factory()->create();
}

function memberOf(Account $account, int $role = AccountUser::ROLE_AGENT, array $userAttributes = []): User
{
    $user = User::factory()->create($userAttributes);
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
        'role' => $role,
    ]);

    return $user;
}

describe('GET /api/v1/accounts/{id}/agents', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = agentsAccount();

        $this->getJson("/api/v1/accounts/{$account->id}/agents")->assertUnauthorized();
    });

    it('returns all agents of the account', function () {
        $account = agentsAccount();
        memberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $agent = memberOf($account);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/agents")
            ->assertOk();

        expect($response->json())->toHaveCount(2);
    });

    it('returns custom fields on agents if present', function () {
        $account = agentsAccount();
        $agent = memberOf($account, userAttributes: ['custom_attributes' => ['test' => 'test']]);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/agents")
            ->assertOk();

        expect($response->json('0.custom_attributes.test'))->toBe('test');
    });
});

describe('POST /api/v1/accounts/{id}/agents', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = agentsAccount();

        $this->postJson("/api/v1/accounts/{$account->id}/agents")->assertUnauthorized();
    });

    it('returns unauthorized for agents', function () {
        $account = agentsAccount();
        $agent = memberOf($account);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/agents", [
                'name' => 'NewUser', 'email' => 'new@example.com', 'role' => 'agent',
            ])
            ->assertUnauthorized();
    });

    it('creates a new agent', function () {
        Notification::fake();
        $account = agentsAccount();
        $admin = memberOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/agents", [
                'name' => 'NewUser', 'email' => 'new@example.com', 'role' => 'agent',
            ])
            ->assertOk();

        expect($response->json('email'))->toBe('new@example.com')
            ->and($response->json('role'))->toBe('agent')
            ->and($response->json('confirmed'))->toBeFalse()
            ->and(User::fromEmail('new@example.com')->name)->toBe('NewUser');

        Notification::assertSentTo(User::fromEmail('new@example.com'), ConfirmationInstructions::class);
    });

    it('rejects an email already in the account', function () {
        $account = agentsAccount();
        $admin = memberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $existing = memberOf($account);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/agents", [
                'name' => 'Dup', 'email' => $existing->email, 'role' => 'agent',
            ])
            ->assertUnprocessable();
    });

    it('adds an existing user of another account without creating a new user', function () {
        Notification::fake();
        $account = agentsAccount();
        $admin = memberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $otherAccountUser = memberOf(agentsAccount());

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/agents", [
                'name' => 'Existing', 'email' => $otherAccountUser->email, 'role' => 'agent',
            ])
            ->assertOk();

        expect(User::query()->where('email', $otherAccountUser->email)->count())->toBe(1)
            ->and($otherAccountUser->accountUsers()->count())->toBe(2);

        Notification::assertNothingSent();
    });
});

describe('PUT /api/v1/accounts/{id}/agents/{agentId}', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = agentsAccount();
        $other = memberOf($account);

        $this->putJson("/api/v1/accounts/{$account->id}/agents/{$other->id}")->assertUnauthorized();
    });

    it('returns unauthorized for agents', function () {
        $account = agentsAccount();
        $agent = memberOf($account);
        $other = memberOf($account);

        $this->actingAs($agent)
            ->putJson("/api/v1/accounts/{$account->id}/agents/{$other->id}", ['name' => 'TestUser'])
            ->assertUnauthorized();
    });

    it('modifies an agent name', function () {
        $account = agentsAccount();
        $admin = memberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $other = memberOf($account);

        $this->actingAs($admin)
            ->putJson("/api/v1/accounts/{$account->id}/agents/{$other->id}", ['name' => 'TestUser'])
            ->assertOk();

        expect($other->refresh()->name)->toBe('TestUser');
    });

    it('modifies account user attributes', function () {
        $account = agentsAccount();
        $admin = memberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $other = memberOf($account);

        $response = $this->actingAs($admin)
            ->putJson("/api/v1/accounts/{$account->id}/agents/{$other->id}", [
                'role' => 'administrator', 'availability' => 'busy', 'auto_offline' => false,
            ])
            ->assertOk();

        expect($response->json('role'))->toBe('administrator')
            ->and($response->json('availability_status'))->toBe('busy')
            ->and($response->json('auto_offline'))->toBeFalse()
            ->and($other->accountUsers()->first()->role)->toBe(AccountUser::ROLE_ADMINISTRATOR);
    });
});

describe('DELETE /api/v1/accounts/{id}/agents/{agentId}', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = agentsAccount();
        $other = memberOf($account);

        $this->deleteJson("/api/v1/accounts/{$account->id}/agents/{$other->id}")->assertUnauthorized();
    });

    it('returns unauthorized for agents', function () {
        $account = agentsAccount();
        $agent = memberOf($account);
        $other = memberOf($account);

        $this->actingAs($agent)
            ->deleteJson("/api/v1/accounts/{$account->id}/agents/{$other->id}")
            ->assertUnauthorized();
    });

    it('deletes the agent and user object if associated with only one account', function () {
        $account = agentsAccount();
        $admin = memberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $other = memberOf($account);

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/agents/{$other->id}")
            ->assertOk();

        expect($account->users()->whereKey($other->id)->exists())->toBeFalse()
            ->and(User::query()->whereKey($other->id)->exists())->toBeFalse();
    });

    it('deletes only the account membership when user belongs to multiple accounts', function () {
        Queue::fake();
        $account = agentsAccount();
        $admin = memberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $other = memberOf($account);
        AccountUser::factory()->create([
            'account_id' => agentsAccount()->id,
            'user_id' => $other->id,
        ]);

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/agents/{$other->id}")
            ->assertOk();

        expect($account->users()->whereKey($other->id)->exists())->toBeFalse()
            ->and($other->accountUsers()->count())->toBe(1);

        Queue::assertNotPushed(DeleteObjectJob::class);
    });
});

describe('POST /api/v1/accounts/{id}/agents/bulk_create', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = agentsAccount();

        $this->postJson("/api/v1/accounts/{$account->id}/agents/bulk_create", [
            'emails' => ['test1@example.com'],
        ])->assertUnauthorized();
    });

    it('creates multiple agents successfully', function () {
        $account = agentsAccount();
        $admin = memberOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $userCountBefore = User::count();

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/agents/bulk_create", [
                'emails' => ['test1@example.com', 'test2@example.com', 'test3@example.com'],
            ])
            ->assertOk();

        expect(User::count())->toBe($userCountBefore + 3)
            ->and($account->accountUsers()->count())->toBe(4);
    });

    it('ignores errors if account user already exists', function () {
        $account = agentsAccount();
        $admin = memberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $existing = memberOf($account, userAttributes: ['email' => 'exists@example.com']);

        $userCountBefore = User::count();

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/agents/bulk_create", [
                'emails' => ['exists@example.com', 'test1@example.com', 'test2@example.com'],
            ])
            ->assertOk();

        expect(User::count())->toBe($userCountBefore + 2)
            ->and($existing->accountUsers()->count())->toBe(1);
    });

    it('clears the onboarding step from account custom attributes', function () {
        $account = agentsAccount();
        $account->update(['custom_attributes' => ['onboarding_step' => 'invite_team']]);
        $admin = memberOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/agents/bulk_create", [
                'emails' => ['test1@example.com'],
            ])
            ->assertOk();

        expect($account->refresh()->custom_attributes)->not->toHaveKey('onboarding_step');
    });
});

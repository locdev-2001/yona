<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;

// Port từ spec/controllers/api/v1/accounts_controller_spec.rb (nhánh show + update).

function accountMember(Account $account, int $role = AccountUser::ROLE_AGENT): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);

    return $user;
}

describe('GET /api/v1/accounts/{id}', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();

        $this->getJson("/api/v1/accounts/{$account->id}")->assertUnauthorized();
    });

    it('returns the account with its settings', function () {
        $account = Account::factory()->create(['settings' => ['auto_resolve_after' => 4320]]);
        $agent = accountMember($account);

        $response = $this->actingAs($agent)->getJson("/api/v1/accounts/{$account->id}")->assertOk();

        expect($response->json('id'))->toBe($account->id)
            ->and($response->json('name'))->toBe($account->name)
            ->and($response->json('settings.auto_resolve_after'))->toBe(4320)
            ->and($response->json('features'))->toBeArray();
    });

    it('omits custom attributes when the account has none', function () {
        $account = Account::factory()->create();
        $agent = accountMember($account);

        $response = $this->actingAs($agent)->getJson("/api/v1/accounts/{$account->id}")->assertOk();

        expect($response->json())->not->toHaveKey('custom_attributes');
    });
});

describe('PATCH /api/v1/accounts/{id}', function () {
    it('rejects an agent', function () {
        $account = Account::factory()->create();
        $agent = accountMember($account);

        $this->actingAs($agent)
            ->patchJson("/api/v1/accounts/{$account->id}", ['auto_resolve_after' => 4320])
            ->assertStatus(401);
    });

    it('merges the auto resolve settings for an administrator', function () {
        $account = Account::factory()->create(['settings' => ['audio_transcriptions' => true]]);
        $admin = accountMember($account, AccountUser::ROLE_ADMINISTRATOR);

        $response = $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}", [
                'auto_resolve_after' => 4320,
                'auto_resolve_message' => 'Closing this for now.',
                'auto_resolve_ignore_waiting' => true,
                'auto_resolve_label' => 'auto-resolved',
            ])
            ->assertOk();

        expect($response->json('settings'))->toBe([
            'audio_transcriptions' => true,
            'auto_resolve_after' => 4320,
            'auto_resolve_message' => 'Closing this for now.',
            'auto_resolve_ignore_waiting' => true,
            'auto_resolve_label' => 'auto-resolved',
        ]);
    });

    it('clears the auto resolve settings when disabled', function () {
        $account = Account::factory()->create(['settings' => ['auto_resolve_after' => 4320, 'auto_resolve_message' => 'Bye']]);
        $admin = accountMember($account, AccountUser::ROLE_ADMINISTRATOR);

        $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}", [
                'auto_resolve_after' => null,
                'auto_resolve_message' => '',
                'auto_resolve_ignore_waiting' => false,
                'auto_resolve_label' => null,
            ])
            ->assertOk();

        expect($account->fresh()->setting('auto_resolve_after'))->toBeNull();
    });

    it('rejects a duration below the ten minute floor', function () {
        $account = Account::factory()->create();
        $admin = accountMember($account, AccountUser::ROLE_ADMINISTRATOR);

        $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}", ['auto_resolve_after' => 5])
            ->assertStatus(422);
    });

    it('updates the account attributes', function () {
        $account = Account::factory()->create();
        $admin = accountMember($account, AccountUser::ROLE_ADMINISTRATOR);

        $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}", ['name' => 'Acme rewritten', 'support_email' => 'help@acme.inc'])
            ->assertOk();

        expect($account->fresh()->name)->toBe('Acme rewritten')
            ->and($account->fresh()->support_email)->toBe('help@acme.inc');
    });

    it('moves the onboarding step forward after an account update', function () {
        $account = Account::factory()->create(['custom_attributes' => ['onboarding_step' => 'account_update']]);
        $admin = accountMember($account, AccountUser::ROLE_ADMINISTRATOR);

        $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}", ['name' => 'Acme'])
            ->assertOk();

        expect($account->fresh()->custom_attributes['onboarding_step'])->toBe('invite_team');
    });
});

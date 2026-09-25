<?php

use App\Models\Account;
use App\Models\AccountInviteLink;
use App\Models\AccountUser;
use App\Models\User;
use Illuminate\Support\Str;

function inviteLinksAccount(): Account
{
    return Account::factory()->create();
}

function inviteLinksMemberOf(Account $account, int $role = AccountUser::ROLE_AGENT): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
        'role' => $role,
    ]);

    return $user;
}

describe('GET /api/v1/accounts/{id}/invite_links', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = inviteLinksAccount();

        $this->getJson("/api/v1/accounts/{$account->id}/invite_links")->assertUnauthorized();
    });

    it('returns unauthorized for agents', function () {
        $account = inviteLinksAccount();
        $agent = inviteLinksMemberOf($account);

        $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/invite_links")
            ->assertUnauthorized();
    });

    it('lists links for the account newest first, without exposing the token', function () {
        $account = inviteLinksAccount();
        $admin = inviteLinksMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $older = AccountInviteLink::factory()->create(['account_id' => $account->id, 'created_by_id' => $admin->id, 'created_at' => now()->subDay()]);
        $newer = AccountInviteLink::factory()->create(['account_id' => $account->id, 'created_by_id' => $admin->id]);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/invite_links")
            ->assertOk();

        expect($response->json('0.id'))->toBe($newer->id)
            ->and($response->json('1.id'))->toBe($older->id)
            ->and($response->json('0'))->not->toHaveKey('token')
            ->and($response->json('0'))->not->toHaveKey('token_digest');
    });

    it('caps the list at 50 links', function () {
        $account = inviteLinksAccount();
        $admin = inviteLinksMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        AccountInviteLink::factory()->count(55)->create(['account_id' => $account->id]);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/invite_links")
            ->assertOk();

        expect($response->json())->toHaveCount(50);
    });
});

describe('POST /api/v1/accounts/{id}/invite_links', function () {
    it('returns unauthorized for agents', function () {
        $account = inviteLinksAccount();
        $agent = inviteLinksMemberOf($account);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/invite_links", [
                'role' => 'agent', 'expires_in_days' => 7,
            ])
            ->assertUnauthorized();
    });

    it('creates a link and returns the raw url once, without the resource exposing it', function () {
        $account = inviteLinksAccount();
        $admin = inviteLinksMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/invite_links", [
                'role' => 'administrator', 'expires_in_days' => 30, 'max_uses' => 3,
            ])
            ->assertCreated();

        $url = $response->json('url');
        expect($url)->toBeString()->toContain('/invite/')
            ->and($response->json('link'))->not->toHaveKey('token')
            ->and($response->json('link.role'))->toBe('administrator')
            ->and($response->json('link.max_uses'))->toBe(3)
            ->and($response->json('link.status'))->toBe('active');

        $token = Str::afterLast($url, '/invite/');
        expect(AccountInviteLink::findByToken($token))->not->toBeNull();
    });

    it('rejects an invalid expiry choice', function () {
        $account = inviteLinksAccount();
        $admin = inviteLinksMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/invite_links", [
                'role' => 'agent', 'expires_in_days' => 14,
            ])
            ->assertUnprocessable();
    });

    it('rejects a max_uses above the cap', function () {
        $account = inviteLinksAccount();
        $admin = inviteLinksMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/invite_links", [
                'role' => 'agent', 'expires_in_days' => 7, 'max_uses' => 1001,
            ])
            ->assertUnprocessable();
    });
});

describe('DELETE /api/v1/accounts/{id}/invite_links/{linkId}', function () {
    it('returns unauthorized for agents', function () {
        $account = inviteLinksAccount();
        $agent = inviteLinksMemberOf($account);
        $link = AccountInviteLink::factory()->create(['account_id' => $account->id]);

        $this->actingAs($agent)
            ->deleteJson("/api/v1/accounts/{$account->id}/invite_links/{$link->id}")
            ->assertUnauthorized();
    });

    it('revokes the link', function () {
        $account = inviteLinksAccount();
        $admin = inviteLinksMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $link = AccountInviteLink::factory()->create(['account_id' => $account->id]);

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/invite_links/{$link->id}")
            ->assertOk();

        expect($link->refresh()->isRevoked())->toBeTrue();
    });

    it('does not revoke an already-revoked link a second time', function () {
        $account = inviteLinksAccount();
        $admin = inviteLinksMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $link = AccountInviteLink::factory()->create(['account_id' => $account->id, 'revoked_at' => now()->subDay()]);
        $revokedAt = $link->refresh()->revoked_at;

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/invite_links/{$link->id}")
            ->assertNotFound();

        expect($link->refresh()->revoked_at)->toEqual($revokedAt);
    });

    it('does not revoke a link belonging to another account', function () {
        $account = inviteLinksAccount();
        $admin = inviteLinksMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $otherLink = AccountInviteLink::factory()->create();

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/invite_links/{$otherLink->id}")
            ->assertNotFound();

        expect($otherLink->refresh()->isRevoked())->toBeFalse();
    });
});

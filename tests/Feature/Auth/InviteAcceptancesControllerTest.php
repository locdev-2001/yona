<?php

use App\Models\Account;
use App\Models\AccountInviteLink;
use App\Models\AccountUser;
use App\Models\User;

describe('GET /invite/{token}', function () {
    it('shows account name and role for a usable link', function () {
        $account = Account::factory()->create(['name' => 'Wayne Enterprises']);
        $link = AccountInviteLink::factory()->administrator()->create(['account_id' => $account->id]);
        $token = AccountInviteLink::generateToken();
        $link->update(['token_digest' => AccountInviteLink::hashToken($token)]);

        $response = $this->get("/invite/{$token}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('v3/views/auth/invite/Index')
            ->where('status', 'active')
            ->where('account.name', 'Wayne Enterprises')
            ->where('account.role', 'administrator'));
    });

    it('reports not_found for an unknown token', function () {
        $response = $this->get('/invite/doesnotexist000000000000000000000000');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->where('status', 'not_found')->where('account', null));
    });

    it('reports revoked status without leaking account details', function () {
        $link = AccountInviteLink::factory()->revoked()->create();
        $token = AccountInviteLink::generateToken();
        $link->update(['token_digest' => AccountInviteLink::hashToken($token)]);

        $response = $this->get("/invite/{$token}");

        $response->assertInertia(fn ($page) => $page->where('status', 'revoked')->where('account', null));
    });

    it('reports expired status', function () {
        $link = AccountInviteLink::factory()->expired()->create();
        $token = AccountInviteLink::generateToken();
        $link->update(['token_digest' => AccountInviteLink::hashToken($token)]);

        $this->get("/invite/{$token}")
            ->assertInertia(fn ($page) => $page->where('status', 'expired'));
    });
});

function createUsableLink(array $overrides = []): array
{
    $token = AccountInviteLink::generateToken();
    $link = AccountInviteLink::factory()->create(array_merge([
        'token_digest' => AccountInviteLink::hashToken($token),
    ], $overrides));

    return [$link, $token];
}

describe('POST /invite/{token} as guest', function () {
    it('creates a confirmed user, joins the account, and logs them in', function () {
        [$link, $token] = createUsableLink();

        $response = $this->post("/invite/{$token}", [
            'name' => 'New Person',
            'email' => 'newperson@example.com',
            'password' => 'Password1!',
        ]);

        $response->assertRedirect("/app/accounts/{$link->account_id}/dashboard");
        $this->assertAuthenticated();

        $user = User::fromEmail('newperson@example.com');
        expect($user)->not->toBeNull()
            ->and($user->isConfirmed())->toBeTrue();

        expect(AccountUser::query()->where(['account_id' => $link->account_id, 'user_id' => $user->id])->first())
            ->not->toBeNull();
        expect($link->refresh()->use_count)->toBe(1);
    });

    it('rejects a weak password', function () {
        [, $token] = createUsableLink();

        $this->post("/invite/{$token}", [
            'email' => 'weak@example.com',
            'password' => 'weak',
        ])->assertSessionHasErrors('password');

        expect(User::fromEmail('weak@example.com'))->toBeNull();
    });

    it('rejects an already-registered email with a validation error', function () {
        [, $token] = createUsableLink();
        User::factory()->create(['email' => 'exists@example.com']);

        $this->post("/invite/{$token}", [
            'email' => 'exists@example.com',
            'password' => 'Password1!',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    });

    it('redirects back with an alert for a revoked link', function () {
        [$link, $token] = createUsableLink(['revoked_at' => now()]);

        $response = $this->post("/invite/{$token}", [
            'email' => 'blocked@example.com',
            'password' => 'Password1!',
        ]);

        $response->assertRedirect();
        expect(session('alert'))->not->toBeNull();
        expect(User::fromEmail('blocked@example.com'))->toBeNull();
    });

    it('redirects back with an alert for an unknown token', function () {
        $response = $this->post('/invite/doesnotexist000000000000000000000000', [
            'email' => 'nobody@example.com',
            'password' => 'Password1!',
        ]);

        $response->assertRedirect();
        expect(session('alert'))->not->toBeNull();
    });
});

describe('POST /invite/{token} as logged in user', function () {
    it('joins the current user to the account with the link role', function () {
        [$link, $token] = createUsableLink(['role' => AccountUser::ROLE_ADMINISTRATOR]);
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post("/invite/{$token}");

        $response->assertRedirect("/app/accounts/{$link->account_id}/dashboard");

        $membership = AccountUser::query()->where(['account_id' => $link->account_id, 'user_id' => $user->id])->first();
        expect($membership)->not->toBeNull()
            ->and($membership->role)->toBe(AccountUser::ROLE_ADMINISTRATOR);
    });

    it('is idempotent for a user already a member', function () {
        $account = Account::factory()->create();
        [$link, $token] = createUsableLink(['account_id' => $account->id]);
        $user = User::factory()->create();
        AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);

        $this->actingAs($user)->post("/invite/{$token}")
            ->assertRedirect("/app/accounts/{$account->id}/dashboard");

        expect($user->accountUsers()->count())->toBe(1)
            ->and($link->refresh()->use_count)->toBe(0);
    });
});

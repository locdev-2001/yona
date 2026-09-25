<?php

use App\Builders\AgentBuilder;
use App\Models\Account;
use App\Models\AccountInviteLink;
use App\Models\AccountUser;
use App\Models\User;
use App\Notifications\ConfirmationInstructions;
use App\Services\OAuth\OAuthIdentity;
use App\Services\OAuth\OAuthSignInService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

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
    it('creates an unconfirmed user, joins the account, emails a confirmation link, and does not log in', function () {
        Notification::fake();
        [$link, $token] = createUsableLink();

        $response = $this->post("/invite/{$token}", [
            'name' => 'New Person',
            'email' => 'newperson@example.com',
            'password' => 'Password1!',
        ]);

        $response->assertRedirect('/app/auth/verify-email');
        expect(session('signup_email'))->toBe('newperson@example.com');
        $this->assertGuest();

        $user = User::fromEmail('newperson@example.com');
        expect($user)->not->toBeNull()
            ->and($user->isConfirmed())->toBeFalse();
        Notification::assertSentTo($user, ConfirmationInstructions::class);

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

    it('rejects an email on a blocked domain, same as public signup', function () {
        config(['yona.blocked_email_domains' => 'spamdomain\\.com']);
        [, $token] = createUsableLink();

        $this->post("/invite/{$token}", [
            'email' => 'ai@spamdomain.com',
            'password' => 'Password1!',
        ])->assertSessionHasErrors('email');

        expect(User::fromEmail('ai@spamdomain.com'))->toBeNull();
    });

    it('does not create a second account when the same email joins twice', function () {
        [, $tokenA] = createUsableLink();
        [, $tokenB] = createUsableLink();

        $this->post("/invite/{$tokenA}", [
            'email' => 'racer@example.com',
            'password' => 'Password1!',
        ])->assertRedirect('/app/auth/verify-email');

        $this->post("/invite/{$tokenB}", [
            'email' => 'racer@example.com',
            'password' => 'Password1!',
        ])->assertSessionHasErrors('email');

        expect(User::query()->where('email', 'racer@example.com')->count())->toBe(1);
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

    it('stays a member even if the link became unusable between page load and submit', function () {
        $account = Account::factory()->create();
        [$link, $token] = createUsableLink(['account_id' => $account->id]);
        $user = User::factory()->create();
        AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);
        $link->update(['revoked_at' => now()]);

        $this->actingAs($user)->post("/invite/{$token}")
            ->assertRedirect("/app/accounts/{$account->id}/dashboard");
    });
});

describe('email confirmation closes the invite-link takeover path', function () {
    it('does not let a later Google sign-in trust the password set through the invite link', function () {
        [, $token] = createUsableLink();
        $this->post("/invite/{$token}", [
            'email' => 'victim@example.com',
            'password' => 'AttackerPassword1!',
        ]);
        $attacker = User::fromEmail('victim@example.com');
        expect($attacker->isConfirmed())->toBeFalse();

        $claimed = app(OAuthSignInService::class)->resolveUser(
            new OAuthIdentity(email: 'victim@example.com', emailVerified: true, name: 'Victim Real')
        );

        expect($claimed->id)->toBe($attacker->id)
            ->and($claimed->isConfirmed())->toBeTrue()
            ->and(Hash::check('AttackerPassword1!', $claimed->refresh()->password))->toBeFalse();
    });

    it('does not let the attacker into a second tenant that invites the same email by address', function () {
        [, $token] = createUsableLink();
        $this->post("/invite/{$token}", [
            'email' => 'victim@example.com',
            'password' => 'AttackerPassword1!',
        ]);

        $otherAccount = Account::factory()->create();
        $otherAdmin = User::factory()->create();
        (new AgentBuilder(email: 'victim@example.com', inviter: $otherAdmin, account: $otherAccount))->perform();

        expect(User::fromEmail('victim@example.com')->isConfirmed())->toBeFalse();

        $this->from('/app/login')->post('/app/login', [
            'email' => 'victim@example.com',
            'password' => 'AttackerPassword1!',
        ])->assertSessionHasErrors('email');
        $this->assertGuest();
    });
});

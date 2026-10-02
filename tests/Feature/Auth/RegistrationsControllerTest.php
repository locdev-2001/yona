<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use App\Notifications\ConfirmationInstructions;
use App\Support\CurrentUserSession;
use Illuminate\Support\Facades\Notification;

// Đăng ký tài khoản qua flow session/Inertia.

it('serves the signup page to guests', function () {
    config(['inertia.ssr.enabled' => false]);

    $this->get('/app/auth/signup')->assertOk();
});

describe('POST /app/auth/signup', function () {
    beforeEach(function () {
        Notification::fake();
    });

    it('creates an unconfirmed user with an administrator account and sends confirmation mail', function () {
        $response = $this->post('/app/auth/signup', [
            'account_name' => 'Wayne',
            'user_full_name' => 'Bruce',
            'email' => 'bruce@wayne.enterprises',
            'password' => 'Password1!',
        ]);

        $response->assertRedirect('/app/auth/verify-email');

        $user = User::query()->where('email', 'bruce@wayne.enterprises')->first();
        expect($user)->not->toBeNull()
            ->and($user->isConfirmed())->toBeFalse()
            ->and($user->confirmation_token)->not->toBeNull()
            ->and($user->accountUsers()->first()->role)->toBe(AccountUser::ROLE_ADMINISTRATOR)
            ->and($user->accounts()->first()->name)->toBe('Wayne');

        Notification::assertSentTo($user, ConfirmationInstructions::class);
        $this->assertGuest();
    });

    it('names the account after the user when the form sends no account name', function () {
        $this->post('/app/auth/signup', [
            'user_full_name' => 'Lan',
            'email' => 'lan@gmail.com',
            'password' => 'Password1!',
        ])->assertRedirect('/app/auth/verify-email');

        expect(User::query()->where('email', 'lan@gmail.com')->first()->accounts()->first()->name)->toBe('Lan');
    });

    it('rejects a duplicate email', function () {
        User::factory()->create(['email' => 'bruce@wayne.enterprises']);

        $response = $this->from('/app/auth/signup')->post('/app/auth/signup', [
            'email' => 'bruce@wayne.enterprises',
            'password' => 'Password1!',
        ]);

        $response->assertSessionHasErrors('email');
        Notification::assertNothingSent();
    });

    it('rejects a weak password', function () {
        $response = $this->from('/app/auth/signup')->post('/app/auth/signup', [
            'email' => 'bruce@wayne.enterprises',
            'password' => 'password',
        ]);

        $response->assertSessionHasErrors('password');
    });

    it('rejects a blocked email domain', function () {
        config(['yona.blocked_email_domains' => 'spamdomain\\.com']);

        $response = $this->from('/app/auth/signup')->post('/app/auth/signup', [
            'email' => 'user@spamdomain.com',
            'password' => 'Password1!',
        ]);

        $response->assertSessionHasErrors('email');
    });
});

describe('GET /app/auth/confirmation', function () {
    it('confirms the user, logs in, and redirects to onboarding', function () {
        Notification::fake();

        $this->post('/app/auth/signup', [
            'account_name' => 'Wayne',
            'user_full_name' => 'Bruce',
            'email' => 'bruce@wayne.enterprises',
            'password' => 'Password1!',
        ]);

        $user = User::query()->where('email', 'bruce@wayne.enterprises')->first();
        $account = $user->accounts()->first();

        $this->get('/app/auth/confirmation?confirmation_token='.$user->confirmation_token)
            ->assertRedirect('/app');

        expect($user->refresh()->isConfirmed())->toBeTrue();
        $this->assertAuthenticatedAs($user);

        $this->get('/app')->assertRedirect("/app/accounts/{$account->id}/dashboard");
        $this->get("/app/accounts/{$account->id}/dashboard")->assertRedirect("/app/accounts/{$account->id}/onboarding");
    });

    it('tracks the session opened by the confirmation link', function () {
        $user = User::factory()->unconfirmed()->create(['confirmation_token' => 'confirm-me']);

        $this->get('/app/auth/confirmation?confirmation_token=confirm-me')->assertRedirect('/app');

        $this->assertAuthenticatedAs($user);
        expect($user->userSessions()->sole()->client_id)->toBe(session(CurrentUserSession::SESSION_KEY));
    });

    it('redirects to login with an invalid token', function () {
        $this->get('/app/auth/confirmation?confirmation_token=invalid')->assertRedirect('/app/login');
        $this->assertGuest();
    });
});

describe('onboarding account_details', function () {
    it('saves details, clears onboarding step, and redirects to the dashboard', function () {
        $user = User::factory()->create();
        $account = Account::factory()->create([
            'custom_attributes' => ['onboarding_step' => 'account_details'],
        ]);
        AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $user->id]);

        $response = $this->actingAs($user)->post("/app/accounts/{$account->id}/onboarding", [
            'name' => 'Wayne Enterprises',
            'locale' => 'vi',
            'website' => 'wayne.enterprises',
            'industry' => 'Technology',
            'company_size' => '1-10',
        ]);

        $response->assertRedirect("/app/accounts/{$account->id}/dashboard");

        $account->refresh();
        expect($account->name)->toBe('Wayne Enterprises')
            ->and($account->locale)->toBe('vi')
            ->and($account->onboardingStep())->toBeNull()
            ->and($account->custom_attributes['website'])->toBe('wayne.enterprises')
            ->and($account->custom_attributes['industry'])->toBe('Technology');

        $this->get("/app/accounts/{$account->id}/dashboard")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/conversation/ConversationView'));
    });

    it('is forbidden for agents', function () {
        $user = User::factory()->create();
        $account = Account::factory()->create([
            'custom_attributes' => ['onboarding_step' => 'account_details'],
        ]);
        AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);

        $this->actingAs($user)->post("/app/accounts/{$account->id}/onboarding", ['website' => 'x.com'])
            ->assertForbidden();
    });

    it('is a no-op replay after onboarding finished', function () {
        $user = User::factory()->create();
        $account = Account::factory()->create(['name' => 'Original']);
        AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $user->id]);

        $this->actingAs($user)->post("/app/accounts/{$account->id}/onboarding", [
            'name' => 'Changed',
            'website' => 'x.com',
        ])->assertRedirect("/app/accounts/{$account->id}/dashboard");

        expect($account->refresh()->name)->toBe('Original');
    });
});

<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;

// Port từ refs/chatwoot/spec/controllers/devise/session_controller_spec.rb
// (đổi devise_token_auth JSON API sang session auth Laravel/Inertia; phần
// sso_auth_token + permissions/accounts chưa port — xem bảng trace A1).

describe('POST /app/login', function () {
    it('returns unauthorized with invalid credentials', function () {
        $response = $this->from('/app/login')->post('/app/login', [
            'email' => 'invalid@invalid.com',
            'password' => 'invalid',
        ]);

        $response->assertSessionHasErrors(['email' => 'Invalid login credentials. Please try again.']);
        $this->assertGuest();
    });

    it('returns an unconfirmed user error for unconfirmed users', function () {
        $user = User::factory()->unconfirmed()->create();

        $response = $this->from('/app/login')->post('/app/login', [
            'email' => $user->email,
            'password' => 'Password1!',
        ]);

        $response->assertSessionHasErrors('email');
        expect(session('errors')->first('email'))->toContain($user->email);
        $this->assertGuest();
    });

    it('authenticates with valid credentials', function () {
        $user = User::factory()->create();

        $response = $this->post('/app/login', [
            'email' => $user->email,
            'password' => 'Password1!',
        ]);

        $response->assertRedirect('/app');
        $this->assertAuthenticatedAs($user);
    });

    it('forces a full page load for Inertia login requests (bundle boundary v3 -> app)', function () {
        $user = User::factory()->create();

        $this->post('/app/login', [
            'email' => $user->email,
            'password' => 'Password1!',
        ], ['X-Inertia' => 'true'])
            ->assertStatus(409)
            ->assertHeader('X-Inertia-Location', '/app');
    });

    it('authenticates with new password special characters', function () {
        $user = User::factory()->create(['password' => 'Password1!.><?']);

        $response = $this->post('/app/login', [
            'email' => $user->email,
            'password' => 'Password1!.><?',
        ]);

        $response->assertRedirect('/app');
        $this->assertAuthenticatedAs($user);
    });

    it('tracks sign in count and timestamps', function () {
        $user = User::factory()->create();

        $this->post('/app/login', [
            'email' => $user->email,
            'password' => 'Password1!',
        ]);

        $user->refresh();
        expect($user->sign_in_count)->toBe(1)
            ->and($user->current_sign_in_at)->not->toBeNull();
    });

    it('rate limits repeated failed attempts', function () {
        $user = User::factory()->create();

        foreach (range(1, 5) as $attempt) {
            $this->post('/app/login', [
                'email' => $user->email,
                'password' => 'wrong-password',
            ]);
        }

        $response = $this->from('/app/login')->post('/app/login', [
            'email' => $user->email,
            'password' => 'Password1!',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    });
});

describe('GET /app/login', function () {
    it('renders the login page', function () {
        $this->get('/app/login')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('v3/views/login/Index'));
    });

    it('redirects authenticated users to the dashboard', function () {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/app/login')->assertRedirect('/app');
    });
});

describe('POST /app/logout', function () {
    it('logs the user out', function () {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/app/logout')->assertRedirect('/app/login');
        $this->assertGuest();
    });
});

describe('GET /app', function () {
    it('redirects guests to the login page', function () {
        $this->get('/app')->assertRedirect('/app/login');
    });

    it('redirects authenticated users to their account dashboard', function () {
        $user = User::factory()->create();
        $account = Account::factory()->create();
        AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);

        $this->actingAs($user)->get('/app')->assertRedirect("/app/accounts/{$account->id}/dashboard");

        $this->get("/app/accounts/{$account->id}/dashboard")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/conversation/ConversationView'));
    });

    it('renders the no-accounts page for users without an account', function () {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/app')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/NoAccounts'));
    });
});

<?php

use App\Models\User;
use App\Models\UserSession;
use App\Services\Mfa\ManagementService;
use App\Services\Mfa\TokenService;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Testing\TestResponse;
use OTPHP\TOTP;

// Port từ refs/chatwoot/spec/controllers/devise_overrides/sessions_controller_spec.rb
// (phần MFA + giới hạn phiên). Chatwoot trả JSON 206/409; Yona là Inertia nên
// cùng thông tin đó về qua prop của trang đăng nhập.

// Trang đăng nhập là Inertia: thiếu header này thì Inertia::location trả 302.
function postLogin(array $payload): TestResponse
{
    return test()->post('/app/login', $payload, ['X-Inertia' => 'true']);
}

function otpFor(User $user): string
{
    return TOTP::createFromSecret($user->refresh()->otp_secret)->now();
}

describe('login with MFA', function () {
    it('stops at the OTP step after a correct password', function () {
        $user = User::factory()->withMfa()->create();

        $response = postLogin(['email' => $user->email, 'password' => 'Password1!'])->assertOk();

        expect($response->json('component'))->toBe('v3/views/login/Index')
            ->and($response->json('props.mfaRequired'))->toBeTrue()
            ->and($response->json('props.mfaToken'))->not->toBeEmpty();
        $this->assertGuest();
        expect($user->userSessions()->count())->toBe(0);
    });

    it('signs in with a valid otp code', function () {
        $user = User::factory()->withMfa()->create();
        $token = (new TokenService)->generateToken($user);

        postLogin(['mfa_token' => $token, 'otp_code' => otpFor($user)])
            ->assertStatus(409)
            ->assertHeader('X-Inertia-Location', '/app');

        $this->assertAuthenticatedAs($user);
        expect($user->userSessions()->count())->toBe(1);
    });

    it('signs in with a backup code', function () {
        $user = User::factory()->withMfa()->create();
        $codes = (new ManagementService($user))->generateBackupCodes();
        $token = (new TokenService)->generateToken($user);

        postLogin(['mfa_token' => $token, 'backup_code' => $codes[0]])
            ->assertStatus(409);

        $this->assertAuthenticatedAs($user);
    });

    it('rejects an invalid otp code and keeps the OTP step on screen', function () {
        $user = User::factory()->withMfa()->create();
        $token = (new TokenService)->generateToken($user);

        $response = postLogin(['mfa_token' => $token, 'otp_code' => '000000'])->assertOk();

        expect($response->json('props.mfaRequired'))->toBeTrue()
            ->and($response->json('props.mfaToken'))->toBe($token)
            ->and($response->json('props.mfaError'))->toBe(__('errors.mfa.invalid_code'));
        $this->assertGuest();
    });

    it('rejects an expired mfa token', function () {
        $user = User::factory()->withMfa()->create();
        $expired = Crypt::encryptString(json_encode([
            'user_id' => $user->id,
            'exp' => now()->subMinute()->getTimestamp(),
        ]));

        $response = postLogin(['mfa_token' => $expired, 'otp_code' => otpFor($user)])->assertOk();

        expect($response->json('props.mfaError'))->toBe(__('errors.mfa.invalid_token'));
        $this->assertGuest();
    });

    it('does not ask for an otp code when MFA is off', function () {
        $user = User::factory()->create();

        postLogin(['email' => $user->email, 'password' => 'Password1!'])
            ->assertStatus(409);

        $this->assertAuthenticatedAs($user);
    });
});

describe('session limit at login', function () {
    it('tracks a session row for each login', function () {
        $user = User::factory()->create();

        postLogin(['email' => $user->email, 'password' => 'Password1!']);

        $session = $user->userSessions()->sole();
        expect($session->client_id)->not->toBeEmpty()
            ->and($session->last_activity_at)->not->toBeNull();
    });

    it('shows the session picker once the limit is reached', function () {
        $user = User::factory()->create();
        UserSession::factory()->count(config('yona.max_user_sessions'))->for($user)->create();

        $response = postLogin(['email' => $user->email, 'password' => 'Password1!'])->assertOk();

        expect($response->json('component'))->toBe('v3/views/login/Index')
            ->and($response->json('props.sessionsLimitReached'))->toBeTrue()
            ->and($response->json('props.sessions'))->toHaveCount((int) config('yona.max_user_sessions'));
        $this->assertGuest();
        expect($user->userSessions()->count())->toBe((int) config('yona.max_user_sessions'));
    });

    it('logs in after revoking the chosen session', function () {
        $user = User::factory()->create();
        UserSession::factory()->count(config('yona.max_user_sessions'))->for($user)->create();
        $target = $user->userSessions()->first();

        postLogin([
            'email' => $user->email,
            'password' => 'Password1!',
            'revoke_session_id' => $target->id,
        ])->assertStatus(409);

        $this->assertAuthenticatedAs($user);
        expect(UserSession::query()->find($target->id))->toBeNull()
            ->and($user->userSessions()->count())->toBe((int) config('yona.max_user_sessions'));
    });

    it('logs in after revoking every session', function () {
        $user = User::factory()->create();
        UserSession::factory()->count(config('yona.max_user_sessions'))->for($user)->create();

        postLogin([
            'email' => $user->email,
            'password' => 'Password1!',
            'revoke_all_sessions' => true,
        ])->assertStatus(409);

        $this->assertAuthenticatedAs($user);
        expect($user->userSessions()->count())->toBe(1);
    });

    it('evicts the least recently active session after MFA instead of asking again', function () {
        $user = User::factory()->withMfa()->create();
        UserSession::factory()->count(config('yona.max_user_sessions'))->for($user)
            ->sequence(fn ($sequence) => ['last_activity_at' => now()->subDays(30 - $sequence->index)])
            ->create();
        $oldest = $user->userSessions()->orderBy('last_activity_at')->first();

        postLogin([
            'mfa_token' => (new TokenService)->generateToken($user),
            'otp_code' => otpFor($user),
        ])->assertStatus(409);

        $this->assertAuthenticatedAs($user);
        expect(UserSession::query()->find($oldest->id))->toBeNull();
    });
});

it('removes the session row on logout', function () {
    $user = User::factory()->create();
    postLogin(['email' => $user->email, 'password' => 'Password1!']);
    expect($user->userSessions()->count())->toBe(1);

    $this->post('/app/logout', [], ['X-Inertia' => 'true'])->assertStatus(409);

    expect($user->userSessions()->count())->toBe(0);
    $this->assertGuest();
});

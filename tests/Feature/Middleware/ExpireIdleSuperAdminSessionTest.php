<?php

use App\Http\Middleware\ExpireIdleSuperAdminSession;
use App\Models\SuperAdmin;
use App\Models\User;
use OTPHP\TOTP;

beforeEach(function () {
    config(['yona.super_admin_idle_minutes' => 120]);
});

// 2FA luôn bắt buộc: đăng nhập trọn vẹn nghĩa là qua cả bước mật khẩu lẫn OTP.
function signInSuperAdmin(): SuperAdmin
{
    $superAdmin = SuperAdmin::factory()->withMfa()->create(['password' => 'Password1!']);

    $response = test()->post('/super_admin/sign_in', [
        'super_admin' => ['email' => $superAdmin->email, 'password' => 'Password1!'],
    ], ['X-Inertia' => 'true'])->assertOk();

    $code = TOTP::createFromSecret($superAdmin->refresh()->otp_secret)->now();

    test()->post('/super_admin/sign_in', [
        'otp_token' => $response->json('props.otpToken'),
        'otp_code' => $code,
    ])->assertRedirect('/super_admin');

    return $superAdmin;
}

it('signs the super admin out on the first request after the idle limit', function () {
    signInSuperAdmin();
    $this->get('/super_admin')->assertOk();

    $this->travel(3)->hours();

    $this->get('/super_admin')->assertRedirect('/super_admin/sign_in');
    expect(auth()->guard('super_admin')->check())->toBeFalse()
        ->and(session()->has(ExpireIdleSuperAdminSession::LAST_SEEN_SESSION_KEY))->toBeFalse();
});

it('keeps an active super admin signed in and slides the idle window', function () {
    signInSuperAdmin();
    $this->get('/super_admin')->assertOk();

    $this->travel(30)->minutes();

    $this->get('/super_admin')->assertOk();
    expect(session(ExpireIdleSuperAdminSession::LAST_SEEN_SESSION_KEY))->toBe(now()->timestamp);
});

it('starts the idle clock instead of signing out a session opened before the clock existed', function () {
    $this->actingAs(SuperAdmin::factory()->withMfa()->create(), 'super_admin');
    expect(session()->has(ExpireIdleSuperAdminSession::LAST_SEEN_SESSION_KEY))->toBeFalse();

    $this->get('/super_admin')->assertOk();

    expect(session(ExpireIdleSuperAdminSession::LAST_SEEN_SESSION_KEY))->toBe(now()->timestamp);
});

it('does not refresh the idle clock from pages outside the super admin area', function () {
    signInSuperAdmin();
    $this->get('/super_admin')->assertOk();
    $lastSeenAt = session(ExpireIdleSuperAdminSession::LAST_SEEN_SESSION_KEY);

    $this->travel(30)->minutes();
    $this->get('/app/login');

    expect(session(ExpireIdleSuperAdminSession::LAST_SEEN_SESSION_KEY))->toBe($lastSeenAt);
});

it('leaves the agent session in the same browser signed in', function () {
    $user = User::factory()->create();
    $this->post('/app/login', ['email' => $user->email, 'password' => 'Password1!']);
    signInSuperAdmin();
    $this->get('/super_admin')->assertOk();

    $this->travel(3)->hours();

    $this->get('/super_admin')->assertRedirect('/super_admin/sign_in');

    // App trong test sống qua nhiều request nên `auth:super_admin` đã đổi guard
    // mặc định và guard còn nhớ user; dựng lại như một request mới của trình duyệt.
    app('auth')->forgetGuards();
    app('auth')->shouldUse('web');
    $this->getJson('/api/v1/profile')->assertOk()->assertJsonPath('id', $user->id);
});

it('does not reuse a stale idle clock after the super admin signs in again', function () {
    signInSuperAdmin();
    $this->get('/super_admin')->assertOk();
    $this->get('/super_admin/logout')->assertRedirect('/');

    $this->travel(3)->hours();
    signInSuperAdmin();

    $this->get('/super_admin')->assertOk();
});

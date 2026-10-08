<?php

use App\Http\Middleware\ExpireIdleSuperAdminSession;
use App\Models\SuperAdmin;
use App\Models\User;

beforeEach(function () {
    config(['yona.super_admin_idle_minutes' => 120]);
});

function signInSuperAdmin(): SuperAdmin
{
    $superAdmin = SuperAdmin::factory()->create(['password' => 'Password1!']);

    test()->post('/admin/sign_in', [
        'super_admin' => ['email' => $superAdmin->email, 'password' => 'Password1!'],
    ])->assertRedirect('/admin');

    return $superAdmin;
}

it('signs the super admin out on the first request after the idle limit', function () {
    signInSuperAdmin();
    $this->get('/admin')->assertOk();

    $this->travel(3)->hours();

    $this->get('/admin')->assertRedirect('/admin/sign_in');
    expect(auth()->guard('super_admin')->check())->toBeFalse()
        ->and(session()->has(ExpireIdleSuperAdminSession::LAST_SEEN_SESSION_KEY))->toBeFalse();
});

it('keeps an active super admin signed in and slides the idle window', function () {
    signInSuperAdmin();
    $this->get('/admin')->assertOk();

    $this->travel(30)->minutes();

    $this->get('/admin')->assertOk();
    expect(session(ExpireIdleSuperAdminSession::LAST_SEEN_SESSION_KEY))->toBe(now()->timestamp);
});

it('starts the idle clock instead of signing out a session opened before the clock existed', function () {
    $this->actingAs(SuperAdmin::factory()->withMfa()->create(), 'super_admin');
    expect(session()->has(ExpireIdleSuperAdminSession::LAST_SEEN_SESSION_KEY))->toBeFalse();

    $this->get('/admin')->assertOk();

    expect(session(ExpireIdleSuperAdminSession::LAST_SEEN_SESSION_KEY))->toBe(now()->timestamp);
});

it('does not refresh the idle clock from pages outside the super admin area', function () {
    signInSuperAdmin();
    $this->get('/admin')->assertOk();
    $lastSeenAt = session(ExpireIdleSuperAdminSession::LAST_SEEN_SESSION_KEY);

    $this->travel(30)->minutes();
    $this->get('/app/login');

    expect(session(ExpireIdleSuperAdminSession::LAST_SEEN_SESSION_KEY))->toBe($lastSeenAt);
});

it('leaves the agent session in the same browser signed in', function () {
    $user = User::factory()->create();
    $this->post('/app/login', ['email' => $user->email, 'password' => 'Password1!']);
    signInSuperAdmin();
    $this->get('/admin')->assertOk();

    $this->travel(3)->hours();

    $this->get('/admin')->assertRedirect('/admin/sign_in');

    // App trong test sống qua nhiều request nên `auth:super_admin` đã đổi guard
    // mặc định và guard còn nhớ user; dựng lại như một request mới của trình duyệt.
    app('auth')->forgetGuards();
    app('auth')->shouldUse('web');
    $this->getJson('/api/v1/profile')->assertOk()->assertJsonPath('id', $user->id);
});

it('does not reuse a stale idle clock after the super admin signs in again', function () {
    signInSuperAdmin();
    $this->get('/admin')->assertOk();
    $this->get('/admin/logout')->assertRedirect('/');

    $this->travel(3)->hours();
    signInSuperAdmin();

    $this->get('/admin')->assertOk();
});

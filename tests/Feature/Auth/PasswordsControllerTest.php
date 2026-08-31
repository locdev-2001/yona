<?php

use App\Models\User;
use App\Notifications\ResetPasswordInstructions;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;

// Viết từ source DeviseOverrides::PasswordsController của Chatwoot
// (spec gốc chỉ có bản enterprise — không mở). Hành vi chốt: #update đặt
// mật khẩu qua reset token, XÁC NHẬN luôn user chưa confirm (accept invite),
// xóa token và đăng nhập; #create luôn trả 200 để không lộ email tồn tại.

describe('POST /app/auth/password', function () {
    it('sends reset password instructions for an existing user', function () {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/app/auth/password', ['email' => $user->email])->assertOk();

        expect($user->refresh()->reset_password_token)->not->toBeNull();
        Notification::assertSentTo($user, ResetPasswordInstructions::class);
    });

    it('returns 200 without sending anything for an unknown email', function () {
        Notification::fake();

        $this->postJson('/app/auth/password', ['email' => 'nobody@example.com'])->assertOk();

        Notification::assertNothingSent();
    });
});

describe('GET /app/auth/password/edit', function () {
    it('redirects to login without a token', function () {
        $this->get('/app/auth/password/edit')->assertRedirect('/app/login');
    });

    it('renders the set-new-password page with the token', function () {
        $this->get('/app/auth/password/edit?reset_password_token=abc123')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('v3/views/auth/password/Edit')
                ->where('resetPasswordToken', 'abc123'));
    });
});

describe('PUT /app/auth/password', function () {
    it('sets a new password, confirms an invited user, and signs them in', function () {
        $user = User::factory()->unconfirmed()->create();
        $token = $user->generateResetPasswordToken();

        $this->putJson('/app/auth/password', [
            'reset_password_token' => $token,
            'password' => 'NewPassword1!',
            'password_confirmation' => 'NewPassword1!',
        ])->assertOk();

        $user->refresh();
        expect($user->isConfirmed())->toBeTrue()
            ->and($user->reset_password_token)->toBeNull()
            ->and($user->confirmation_token)->toBeNull()
            ->and(Auth::check())->toBeTrue()
            ->and(Auth::id())->toBe($user->id);

        Auth::logout();
        expect(Auth::attempt(['email' => $user->email, 'password' => 'NewPassword1!']))->toBeTrue();
    });

    it('rejects an invalid token', function () {
        $this->putJson('/app/auth/password', [
            'reset_password_token' => 'bogus',
            'password' => 'NewPassword1!',
            'password_confirmation' => 'NewPassword1!',
        ])->assertUnprocessable();
    });

    it('rejects a weak password', function () {
        $user = User::factory()->create();
        $token = $user->generateResetPasswordToken();

        $this->putJson('/app/auth/password', [
            'reset_password_token' => $token,
            'password' => 'simple',
            'password_confirmation' => 'simple',
        ])->assertUnprocessable();

        expect($user->refresh()->reset_password_token)->not->toBeNull();
    });
});

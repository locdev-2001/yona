<?php

use App\Models\SuperAdmin;
use App\Models\User;
use App\Services\Mfa\TokenService;

it('chặn khu quản trị khi chưa đăng nhập', function () {
    $this->get('/admin')->assertRedirect('/admin/sign_in');
});

it('user thường không vào được console dù đã đăng nhập dashboard', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/admin')->assertRedirect('/admin/sign_in');
});

it('từ chối mật khẩu sai', function () {
    $superAdmin = SuperAdmin::factory()->create(['password' => 'Password1!']);

    $this->post('/admin/sign_in', ['super_admin' => ['email' => $superAdmin->email, 'password' => 'sai']])
        ->assertRedirect('/admin/sign_in');

    expect(auth()->guard('super_admin')->check())->toBeFalse();
});

it('đăng nhập bằng guard riêng và đăng xuất', function () {
    $superAdmin = SuperAdmin::factory()->create(['password' => 'Password1!']);

    $this->post('/admin/sign_in', ['super_admin' => ['email' => $superAdmin->email, 'password' => 'Password1!']])
        ->assertRedirect('/admin');

    expect(auth()->guard('super_admin')->id())->toBe($superAdmin->id)
        ->and(auth()->guard('web')->check())->toBeFalse();

    $this->get('/admin/logout')->assertRedirect('/');
    expect(auth()->guard('super_admin')->check())->toBeFalse();
});

describe('throttle bước mật khẩu', function () {
    it('khoá sau 5 lần sai mật khẩu cùng email+IP', function () {
        $superAdmin = SuperAdmin::factory()->create(['password' => 'Password1!']);
        $payload = ['super_admin' => ['email' => $superAdmin->email, 'password' => 'sai']];

        for ($i = 0; $i < 5; $i++) {
            $this->post('/admin/sign_in', $payload)->assertRedirect('/admin/sign_in');
        }

        $response = $this->post('/admin/sign_in', [
            'super_admin' => ['email' => $superAdmin->email, 'password' => 'Password1!'],
        ]);

        $response->assertRedirect('/admin/sign_in')->assertSessionHas('error');
        expect(auth()->guard('super_admin')->check())->toBeFalse();
    });

    it('mật khẩu đúng xoá bộ đếm throttle', function () {
        $superAdmin = SuperAdmin::factory()->create(['password' => 'Password1!']);
        $this->post('/admin/sign_in', ['super_admin' => ['email' => $superAdmin->email, 'password' => 'sai']]);

        $this->post('/admin/sign_in', [
            'super_admin' => ['email' => $superAdmin->email, 'password' => 'Password1!'],
        ])->assertRedirect('/admin');
    });
});

it('đăng nhập bằng mật khẩu dù super admin đã bật 2FA', function () {
    $superAdmin = SuperAdmin::factory()->withMfa()->create(['password' => 'Password1!']);

    $this->post('/admin/sign_in', [
        'super_admin' => ['email' => $superAdmin->email, 'password' => 'Password1!'],
    ])->assertRedirect('/admin');

    expect(auth()->guard('super_admin')->id())->toBe($superAdmin->id);
    $this->get('/admin')->assertOk();
    expect($superAdmin->refresh()->otp_required_for_login)->toBeTrue()
        ->and($superAdmin->consumed_timestep)->toBeNull();
});

it('token OTP cũ không thay thế được mật khẩu', function () {
    $superAdmin = SuperAdmin::factory()->withMfa()->create();

    $this->post('/admin/sign_in', [
        'otp_token' => (new TokenService)->generateToken($superAdmin),
        'otp_code' => '123456',
    ])->assertSessionHasErrors(['super_admin.email', 'super_admin.password']);

    expect(auth()->guard('super_admin')->check())->toBeFalse();
});

it('chuyển hướng vĩnh viễn đường dẫn console cũ sang prefix mới', function () {
    $this->get('/super_admin')->assertRedirect('/admin')->assertStatus(301);
    $this->get('/super_admin/accounts/5?page=2')->assertRedirect('/admin/accounts/5?page=2')->assertStatus(301);
});

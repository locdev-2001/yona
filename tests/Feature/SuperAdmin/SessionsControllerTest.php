<?php

use App\Models\SuperAdmin;
use App\Models\User;

// Port từ refs/chatwoot/spec/controllers/super_admin/devise/sessions_controller_spec.rb.
it('chặn khu quản trị khi chưa đăng nhập', function () {
    $this->get('/super_admin')->assertRedirect('/super_admin/sign_in');
});

it('user thường không vào được console dù đã đăng nhập dashboard', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/super_admin')->assertRedirect('/super_admin/sign_in');
});

it('từ chối mật khẩu sai', function () {
    $superAdmin = SuperAdmin::factory()->create(['password' => 'Password1!']);

    $this->post('/super_admin/sign_in', ['super_admin' => ['email' => $superAdmin->email, 'password' => 'sai']])
        ->assertRedirect('/super_admin/sign_in');

    expect(auth()->guard('super_admin')->check())->toBeFalse();
});

it('đăng nhập bằng guard riêng và đăng xuất', function () {
    $superAdmin = SuperAdmin::factory()->create(['password' => 'Password1!']);

    $this->post('/super_admin/sign_in', ['super_admin' => ['email' => $superAdmin->email, 'password' => 'Password1!']])
        ->assertRedirect('/super_admin');

    expect(auth()->guard('super_admin')->id())->toBe($superAdmin->id)
        ->and(auth()->guard('web')->check())->toBeFalse();

    $this->get('/super_admin/logout')->assertRedirect('/');
    expect(auth()->guard('super_admin')->check())->toBeFalse();
});

<?php

use App\Models\SuperAdmin;
use App\Services\Mfa\ManagementService;
use OTPHP\TOTP;

// Super admin chưa bật 2FA bị chặn ở mọi trang console trừ màn cài đặt 2FA +
// logout — luôn bắt buộc, không có cờ tắt.
it('đưa super admin chưa bật 2FA vào màn cài đặt thay vì trang console', function () {
    $superAdmin = SuperAdmin::factory()->create();

    $this->actingAs($superAdmin, 'super_admin')
        ->get('/super_admin')
        ->assertRedirect('/super_admin/mfa/setup');
});

it('vẫn cho super admin chưa bật 2FA đăng xuất', function () {
    $superAdmin = SuperAdmin::factory()->create();

    $this->actingAs($superAdmin, 'super_admin')
        ->get('/super_admin/logout')
        ->assertRedirect('/');
});

it('cho super admin đã bật 2FA dùng console bình thường', function () {
    $superAdmin = SuperAdmin::factory()->withMfa()->create();

    $this->actingAs($superAdmin, 'super_admin')
        ->get('/super_admin')
        ->assertOk();
});

it('đưa super admin đã bật 2FA ra khỏi màn cài đặt thay vì hiện trang trắng', function () {
    $superAdmin = SuperAdmin::factory()->withMfa()->create();

    $this->actingAs($superAdmin, 'super_admin')
        ->get('/super_admin/mfa/setup')
        ->assertRedirect('/super_admin');
});

describe('luồng cài đặt 2FA trong console', function () {
    it('sinh QR + secret khi bắt đầu', function () {
        $superAdmin = SuperAdmin::factory()->create();

        $response = $this->actingAs($superAdmin, 'super_admin')
            ->postJson('/super_admin/mfa')
            ->assertOk();

        expect($response->json('provisioning_url'))->toContain('otpauth://totp')
            ->and($response->json('secret'))->not->toBeEmpty();
    });

    it('kích hoạt xong thì qua được cổng chặn', function () {
        $superAdmin = SuperAdmin::factory()->create();
        (new ManagementService($superAdmin))->enableTwoFactor();
        $code = TOTP::createFromSecret($superAdmin->refresh()->otp_secret)->now();

        $response = $this->actingAs($superAdmin, 'super_admin')
            ->postJson('/super_admin/mfa/verify', ['otp_code' => $code])
            ->assertOk();

        expect($response->json('backup_codes'))->toHaveCount(10);

        $this->actingAs($superAdmin, 'super_admin')->get('/super_admin')->assertOk();
    });

    it('từ chối mã sai khi kích hoạt', function () {
        $superAdmin = SuperAdmin::factory()->create();
        (new ManagementService($superAdmin))->enableTwoFactor();

        $this->actingAs($superAdmin, 'super_admin')
            ->postJson('/super_admin/mfa/verify', ['otp_code' => '000000'])
            ->assertStatus(422);

        $this->actingAs($superAdmin, 'super_admin')
            ->get('/super_admin')
            ->assertRedirect('/super_admin/mfa/setup');
    });

});

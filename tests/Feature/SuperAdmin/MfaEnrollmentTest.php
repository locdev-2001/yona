<?php

use App\Models\SuperAdmin;
use App\Services\Mfa\ManagementService;
use OTPHP\TOTP;

it('cho super admin chưa bật 2FA vào console', function () {
    $superAdmin = SuperAdmin::factory()->create();

    $this->actingAs($superAdmin, 'super_admin')
        ->get('/admin')
        ->assertOk();
});

it('vẫn cho super admin chưa bật 2FA đăng xuất', function () {
    $superAdmin = SuperAdmin::factory()->create();

    $this->actingAs($superAdmin, 'super_admin')
        ->get('/admin/logout')
        ->assertRedirect('/');
});

it('cho super admin đã bật 2FA dùng console bình thường', function () {
    $superAdmin = SuperAdmin::factory()->withMfa()->create();

    $this->actingAs($superAdmin, 'super_admin')
        ->get('/admin')
        ->assertOk();
});

it('đưa super admin đã bật 2FA ra khỏi màn cài đặt thay vì hiện trang trắng', function () {
    $superAdmin = SuperAdmin::factory()->withMfa()->create();

    $this->actingAs($superAdmin, 'super_admin')
        ->get('/admin/mfa/setup')
        ->assertRedirect('/admin');
});

describe('luồng cài đặt 2FA trong console', function () {
    it('sinh QR + secret khi bắt đầu', function () {
        $superAdmin = SuperAdmin::factory()->create();

        $response = $this->actingAs($superAdmin, 'super_admin')
            ->postJson('/admin/mfa')
            ->assertOk();

        expect($response->json('provisioning_url'))->toContain('otpauth://totp')
            ->and($response->json('secret'))->not->toBeEmpty();
    });

    it('vẫn cho kích hoạt 2FA thủ công', function () {
        $superAdmin = SuperAdmin::factory()->create();
        (new ManagementService($superAdmin))->enableTwoFactor();
        $code = TOTP::createFromSecret($superAdmin->refresh()->otp_secret)->now();

        $response = $this->actingAs($superAdmin, 'super_admin')
            ->postJson('/admin/mfa/verify', ['otp_code' => $code])
            ->assertOk();

        expect($response->json('backup_codes'))->toHaveCount(10);

        $this->actingAs($superAdmin, 'super_admin')->get('/admin')->assertOk();
    });

    it('từ chối mã sai khi kích hoạt', function () {
        $superAdmin = SuperAdmin::factory()->create();
        (new ManagementService($superAdmin))->enableTwoFactor();

        $this->actingAs($superAdmin, 'super_admin')
            ->postJson('/admin/mfa/verify', ['otp_code' => '000000'])
            ->assertStatus(422);

        $this->actingAs($superAdmin, 'super_admin')
            ->get('/admin')
            ->assertOk();
    });

});

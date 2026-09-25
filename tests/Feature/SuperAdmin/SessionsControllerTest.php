<?php

use App\Models\SuperAdmin;
use App\Models\User;
use App\Services\Mfa\ManagementService;
use App\Services\Mfa\TokenService;
use OTPHP\TOTP;

function superAdminOtpFor(SuperAdmin $superAdmin): string
{
    return TOTP::createFromSecret($superAdmin->refresh()->otp_secret)->now();
}

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

describe('throttle bước mật khẩu', function () {
    it('khoá sau 5 lần sai mật khẩu cùng email+IP', function () {
        $superAdmin = SuperAdmin::factory()->create(['password' => 'Password1!']);
        $payload = ['super_admin' => ['email' => $superAdmin->email, 'password' => 'sai']];

        for ($i = 0; $i < 5; $i++) {
            $this->post('/super_admin/sign_in', $payload)->assertRedirect('/super_admin/sign_in');
        }

        $response = $this->post('/super_admin/sign_in', [
            'super_admin' => ['email' => $superAdmin->email, 'password' => 'Password1!'],
        ]);

        $response->assertRedirect('/super_admin/sign_in')->assertSessionHas('error');
        expect(auth()->guard('super_admin')->check())->toBeFalse();
    });

    it('mật khẩu đúng xoá bộ đếm throttle', function () {
        $superAdmin = SuperAdmin::factory()->create(['password' => 'Password1!']);
        $this->post('/super_admin/sign_in', ['super_admin' => ['email' => $superAdmin->email, 'password' => 'sai']]);

        $this->post('/super_admin/sign_in', [
            'super_admin' => ['email' => $superAdmin->email, 'password' => 'Password1!'],
        ])->assertRedirect('/super_admin');
    });
});

describe('đăng nhập hai bước với 2FA', function () {
    it('dừng ở bước OTP sau mật khẩu đúng khi đã bật 2FA', function () {
        $superAdmin = SuperAdmin::factory()->withMfa()->create(['password' => 'Password1!']);

        $response = $this->post('/super_admin/sign_in', [
            'super_admin' => ['email' => $superAdmin->email, 'password' => 'Password1!'],
        ], ['X-Inertia' => 'true'])->assertOk();

        expect($response->json('props.otpRequired'))->toBeTrue()
            ->and($response->json('props.otpToken'))->not->toBeEmpty();
        expect(auth()->guard('super_admin')->check())->toBeFalse();
    });

    it('đăng nhập được với mã OTP đúng', function () {
        $superAdmin = SuperAdmin::factory()->withMfa()->create();
        $token = (new TokenService)->generateToken($superAdmin);

        $this->post('/super_admin/sign_in', [
            'otp_token' => $token,
            'otp_code' => superAdminOtpFor($superAdmin),
        ])->assertRedirect('/super_admin');

        expect(auth()->guard('super_admin')->id())->toBe($superAdmin->id);
    });

    it('đăng nhập được bằng mã dự phòng', function () {
        $superAdmin = SuperAdmin::factory()->withMfa()->create();
        $codes = (new ManagementService($superAdmin))->generateBackupCodes();
        $token = (new TokenService)->generateToken($superAdmin);

        $this->post('/super_admin/sign_in', [
            'otp_token' => $token,
            'backup_code' => $codes[0],
        ])->assertRedirect('/super_admin');

        expect(auth()->guard('super_admin')->id())->toBe($superAdmin->id);
    });

    it('từ chối mã OTP sai và giữ nguyên bước OTP', function () {
        $superAdmin = SuperAdmin::factory()->withMfa()->create();
        $token = (new TokenService)->generateToken($superAdmin);

        $response = $this->post('/super_admin/sign_in', [
            'otp_token' => $token,
            'otp_code' => '000000',
        ], ['X-Inertia' => 'true'])->assertOk();

        expect($response->json('props.otpRequired'))->toBeTrue()
            ->and($response->json('props.otpToken'))->toBe($token)
            ->and($response->json('props.otpError'))->toBe(__('errors.mfa.invalid_code'));
        expect(auth()->guard('super_admin')->check())->toBeFalse();
    });

    it('từ chối token OTP hết hạn/không hợp lệ', function () {
        $this->post('/super_admin/sign_in', [
            'otp_token' => 'khong-hop-le',
            'otp_code' => '000000',
        ])->assertRedirect('/super_admin/sign_in')->assertSessionHas('error', __('errors.mfa.invalid_token'));
    });

    it('khoá bước OTP sau 5 lần sai cùng IP', function () {
        $superAdmin = SuperAdmin::factory()->withMfa()->create();
        $token = (new TokenService)->generateToken($superAdmin);

        for ($i = 0; $i < 5; $i++) {
            $this->post('/super_admin/sign_in', ['otp_token' => $token, 'otp_code' => '000000']);
        }

        $response = $this->post('/super_admin/sign_in', [
            'otp_token' => $token,
            'otp_code' => superAdminOtpFor($superAdmin),
        ], ['X-Inertia' => 'true'])->assertOk();

        expect($response->json('props.otpError'))->not->toBeEmpty()
            ->and($response->json('props.otpError'))->not->toBe(__('errors.mfa.invalid_code'));
        expect(auth()->guard('super_admin')->check())->toBeFalse();
    });
});

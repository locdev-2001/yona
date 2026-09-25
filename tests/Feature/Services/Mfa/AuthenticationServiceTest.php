<?php

use App\Models\User;
use App\Services\Mfa\AuthenticationService;
use App\Services\Mfa\ManagementService;
use OTPHP\TOTP;

beforeEach(function () {
    $this->user = User::factory()->withMfa()->create();
    $this->otp = fn (): string => TOTP::createFromSecret($this->user->otp_secret)->now();
});

it('accepts a valid otp code', function () {
    expect((new AuthenticationService($this->user, ($this->otp)()))->authenticate())->toBeTrue();
});

it('rejects an invalid otp code', function () {
    expect((new AuthenticationService($this->user, '000000'))->authenticate())->toBeFalse();
});

it('rejects a null otp code', function () {
    expect((new AuthenticationService($this->user))->authenticate())->toBeFalse();
});

it('refuses to reuse the same otp code twice', function () {
    $code = ($this->otp)();

    expect((new AuthenticationService($this->user, $code))->authenticate())->toBeTrue()
        ->and((new AuthenticationService($this->user->refresh(), $code))->authenticate())->toBeFalse();
});

it('accepts the code from the next time-step even if it was already valid at the tail of the current one', function () {
    $totp = TOTP::createFromSecret($this->user->otp_secret);
    $period = $totp->getPeriod();
    $currentTimestep = intdiv(time(), $period);

    // Mã của bước kế tiếp đã hợp lệ (leeway 0 mới chấp nhận) trước khi thời
    // gian thật sự sang bước đó — kịch bản gây ra C1: verify cũ ghi nhầm
    // consumed_timestep = bước hiện tại thay vì bước mã thật sự khớp.
    $nextStepCode = $totp->at(($currentTimestep + 1) * $period);

    expect((new AuthenticationService($this->user, $nextStepCode))->authenticate())->toBeTrue()
        ->and($this->user->refresh()->consumed_timestep)->toBe($currentTimestep + 1);

    // Cùng mã đó không dùng lại được, kể cả khi thời gian thật đã sang đúng
    // bước mà mã ứng với (không còn là "phát lại từ tương lai" nữa).
    expect((new AuthenticationService($this->user->refresh(), $nextStepCode))->authenticate())->toBeFalse();
});

it('rejects a code matching a time-step that is not newer than the last consumed one', function () {
    $totp = TOTP::createFromSecret($this->user->otp_secret);
    $period = $totp->getPeriod();
    $currentTimestep = intdiv(time(), $period);

    $this->user->forceFill(['consumed_timestep' => $currentTimestep + 1])->save();

    // Mã của bước hiện tại (cũ hơn bước đã tiêu thụ) không được chấp nhận,
    // dù đúng cửa sổ leeway mặc định của thư viện.
    expect((new AuthenticationService($this->user, ($this->otp)()))->authenticate())->toBeFalse();
});

it('accepts a backup code once and marks it used', function () {
    $codes = (new ManagementService($this->user))->generateBackupCodes();

    expect((new AuthenticationService($this->user, null, $codes[0]))->authenticate())->toBeTrue()
        ->and($this->user->refresh()->otp_backup_codes)->toContain(ManagementService::USED_BACKUP_CODE)
        ->and((new AuthenticationService($this->user, null, $codes[0]))->authenticate())->toBeFalse();
});

it('rejects an unknown backup code', function () {
    (new ManagementService($this->user))->generateBackupCodes();

    expect((new AuthenticationService($this->user, null, 'invalid'))->authenticate())->toBeFalse();
});

it('counts remaining backup codes', function () {
    $service = new ManagementService($this->user);
    $codes = $service->generateBackupCodes();
    expect($service->remainingBackupCodesCount())->toBe(10);

    $service->validateBackupCode($codes[3]);
    expect($service->remainingBackupCodesCount())->toBe(9);
});

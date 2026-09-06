<?php

use App\Models\User;
use App\Services\Mfa\AuthenticationService;
use App\Services\Mfa\ManagementService;
use OTPHP\TOTP;

// Port từ refs/chatwoot/spec/services/mfa/authentication_service_spec.rb.

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

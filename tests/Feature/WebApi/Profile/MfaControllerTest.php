<?php

use App\Models\User;
use App\Services\Mfa\ManagementService;
use OTPHP\TOTP;

function currentOtp(User $user): string
{
    return TOTP::createFromSecret($user->refresh()->otp_secret)->now();
}

function enableMfaFor(User $user): void
{
    (new ManagementService($user))->enableTwoFactor();
}

describe('GET /api/v1/profile/mfa', function () {
    it('returns disabled status when 2FA is off', function () {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/v1/profile/mfa')
            ->assertOk()
            ->assertJson(['enabled' => false, 'backup_codes_generated' => false, 'feature_available' => true]);
    });

    it('returns enabled status with backup code count', function () {
        $user = User::factory()->create();
        enableMfaFor($user);
        $user->forceFill(['otp_required_for_login' => true])->save();
        (new ManagementService($user))->generateBackupCodes();

        $this->actingAs($user)->getJson('/api/v1/profile/mfa')
            ->assertOk()
            ->assertJson(['enabled' => true, 'backup_codes_generated' => true, 'remaining_backup_codes' => 10]);
    });

});

describe('POST /api/v1/profile/mfa', function () {
    it('enables 2FA and returns the provisioning url', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/v1/profile/mfa')->assertOk();

        expect($response->json('provisioning_url'))->toContain('otpauth://totp')
            ->and($response->json('secret'))->not->toBeEmpty()
            ->and($user->refresh()->otp_secret)->not->toBeNull();
    });

    it('rejects enabling twice', function () {
        $user = User::factory()->withMfa()->create();

        $this->actingAs($user)->postJson('/api/v1/profile/mfa')
            ->assertStatus(422)
            ->assertJson(['error' => __('errors.mfa.already_enabled')]);
    });
});

describe('POST /api/v1/profile/mfa/verify', function () {
    it('activates 2FA and returns 10 backup codes', function () {
        $user = User::factory()->create();
        enableMfaFor($user);

        $response = $this->actingAs($user)
            ->postJson('/api/v1/profile/mfa/verify', ['otp_code' => currentOtp($user)])
            ->assertOk()
            ->assertJson(['enabled' => true]);

        expect($response->json('backup_codes'))->toHaveCount(10)
            ->and($user->refresh()->otp_required_for_login)->toBeTrue()
            ->and($user->otp_backup_codes)->toHaveCount(10);
    });

    it('rejects an invalid otp code', function () {
        $user = User::factory()->create();
        enableMfaFor($user);

        $this->actingAs($user)->postJson('/api/v1/profile/mfa/verify', ['otp_code' => '000000'])
            ->assertStatus(422)
            ->assertJson(['error' => __('errors.mfa.invalid_code')]);
    });

    it('rejects verifying when already enabled', function () {
        $user = User::factory()->withMfa()->create();

        $this->actingAs($user)->postJson('/api/v1/profile/mfa/verify', ['otp_code' => currentOtp($user)])
            ->assertStatus(422)
            ->assertJson(['error' => __('errors.mfa.already_enabled')]);
    });
});

describe('DELETE /api/v1/profile/mfa', function () {
    it('disables 2FA with password and otp code', function () {
        $user = User::factory()->withMfa()->create();
        (new ManagementService($user))->generateBackupCodes();

        $this->actingAs($user)->deleteJson('/api/v1/profile/mfa', [
            'password' => 'Password1!',
            'otp_code' => currentOtp($user),
        ])->assertOk()->assertJson(['enabled' => false]);

        $user->refresh();
        expect($user->otp_required_for_login)->toBeFalse()
            ->and($user->otp_secret)->toBeNull()
            ->and($user->otp_backup_codes)->toBeNull();
    });

    it('disables 2FA with password and a backup code', function () {
        $user = User::factory()->withMfa()->create();
        $codes = (new ManagementService($user))->generateBackupCodes();

        $this->actingAs($user)->deleteJson('/api/v1/profile/mfa', [
            'password' => 'Password1!',
            'backup_code' => $codes[0],
        ])->assertOk();

        expect($user->refresh()->otp_required_for_login)->toBeFalse();
    });

    it('rejects a wrong password', function () {
        $user = User::factory()->withMfa()->create();

        $this->actingAs($user)->deleteJson('/api/v1/profile/mfa', [
            'password' => 'wrong_password',
            'otp_code' => currentOtp($user),
        ])->assertStatus(422)->assertJson(['error' => __('errors.mfa.invalid_credentials')]);

        expect($user->refresh()->otp_required_for_login)->toBeTrue();
    });

    it('rejects a wrong otp code', function () {
        $user = User::factory()->withMfa()->create();

        $this->actingAs($user)->deleteJson('/api/v1/profile/mfa', [
            'password' => 'Password1!',
            'otp_code' => '000000',
        ])->assertStatus(422)->assertJson(['error' => __('errors.mfa.invalid_code')]);
    });

    it('rejects disabling when 2FA is off', function () {
        $user = User::factory()->create();

        $this->actingAs($user)->deleteJson('/api/v1/profile/mfa', [
            'password' => 'Password1!',
            'otp_code' => '123456',
        ])->assertStatus(422)->assertJson(['error' => __('errors.mfa.not_enabled')]);
    });
});

describe('POST /api/v1/profile/mfa/backup_codes', function () {
    it('regenerates codes with a valid otp', function () {
        $user = User::factory()->withMfa()->create();
        $old = (new ManagementService($user))->generateBackupCodes();

        $response = $this->actingAs($user)
            ->postJson('/api/v1/profile/mfa/backup_codes', ['otp_code' => currentOtp($user)])
            ->assertOk();

        expect($response->json('backup_codes'))->toHaveCount(10)
            ->and($response->json('backup_codes'))->not->toBe($old);
    });

    it('rejects an invalid otp', function () {
        $user = User::factory()->withMfa()->create();

        $this->actingAs($user)->postJson('/api/v1/profile/mfa/backup_codes', ['otp_code' => '000000'])
            ->assertStatus(422)->assertJson(['error' => __('errors.mfa.invalid_code')]);
    });

    it('rejects when 2FA is off', function () {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/v1/profile/mfa/backup_codes', ['otp_code' => '123456'])
            ->assertStatus(422)->assertJson(['error' => __('errors.mfa.not_enabled')]);
    });
});

it('requires authentication', function () {
    $this->getJson('/api/v1/profile/mfa')->assertUnauthorized();
});

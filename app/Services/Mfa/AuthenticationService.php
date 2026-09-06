<?php

namespace App\Services\Mfa;

use App\Models\User;
use OTPHP\TOTP;

// Port app/services/mfa/authentication_service.rb — xác thực một lần đăng nhập
// hoặc một thao tác nhạy cảm bằng mã TOTP hoặc mã dự phòng.
class AuthenticationService
{
    public function __construct(
        private readonly User $user,
        private readonly ?string $otpCode = null,
        private readonly ?string $backupCode = null,
    ) {}

    public function authenticate(): bool
    {
        if ($this->otpCode) {
            return $this->authenticateWithOtp();
        }

        if ($this->backupCode) {
            return (new ManagementService($this->user))->validateBackupCode($this->backupCode);
        }

        return false;
    }

    // Tương đương validate_and_consume_otp! của devise-two-factor: một mã chỉ
    // dùng được một lần, cột consumed_timestep ghi lại timestep vừa tiêu thụ.
    private function authenticateWithOtp(): bool
    {
        if (! $this->user->otp_secret) {
            return false;
        }

        $totp = TOTP::createFromSecret($this->user->otp_secret);

        if (! $totp->verify($this->otpCode, null, User::OTP_LEEWAY_SECONDS)) {
            return false;
        }

        $timestep = (int) floor(time() / $totp->getPeriod());

        if ($this->user->consumed_timestep === $timestep) {
            return false;
        }

        $this->user->forceFill(['consumed_timestep' => $timestep])->save();

        return true;
    }
}

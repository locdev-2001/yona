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
    // dùng được một lần. Thay vì tin vào timestep hiện tại lúc verify (một mã
    // của bước kế tiếp nộp ở cuối bước hiện tại sẽ ghi nhầm timestep, cho phép
    // phát lại), tìm đúng timestep mà mã thật sự khớp (không leeway) rồi chỉ
    // chấp nhận nếu timestep đó mới hơn lần tiêu thụ trước. Ghi nguyên tử bằng
    // UPDATE có điều kiện để hai request đồng thời cùng mã không cùng qua được.
    private function authenticateWithOtp(): bool
    {
        if (! $this->user->otp_secret || ! $this->otpCode) {
            return false;
        }

        // time() thay vì now()->getTimestamp(): otphp tự sinh/kiểm mã bằng đồng hồ
        // hệ thống thật (không đọc Carbon::now()), Carbon::setTestNow() trong test
        // sẽ không khớp nếu dùng now() ở đây.
        $totp = TOTP::createFromSecret($this->user->otp_secret);
        $period = $totp->getPeriod();
        $now = time();

        $matchedTimestep = null;

        foreach ([-1, 0, 1] as $offset) {
            $timestamp = $now + $offset * $period;

            if ($timestamp >= 0 && $totp->verify($this->otpCode, $timestamp, 0)) {
                $matchedTimestep = intdiv($timestamp, $period);
                break;
            }
        }

        if ($matchedTimestep === null) {
            return false;
        }

        $affected = User::query()
            ->whereKey($this->user->getKey())
            ->where(function ($query) use ($matchedTimestep) {
                $query->whereNull('consumed_timestep')->orWhere('consumed_timestep', '<', $matchedTimestep);
            })
            ->update(['consumed_timestep' => $matchedTimestep]);

        return $affected === 1;
    }
}

<?php

namespace App\Services\Mfa;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use OTPHP\TOTP;

// Port app/services/mfa/management_service.rb — bật/tắt 2FA và vòng đời mã dự phòng.
class ManagementService
{
    public const BACKUP_CODES_COUNT = 10;

    // Chatwoot đánh dấu mã đã dùng bằng chuỗi placeholder thay vì xoá khỏi mảng,
    // nhờ vậy đếm được số mã còn lại.
    public const USED_BACKUP_CODE = 'XXXXXXXX';

    public function __construct(private readonly User $user) {}

    public function enableTwoFactor(): void
    {
        $this->user->otp_secret = TOTP::generate()->getSecret();
        $this->user->save();
    }

    public function disableTwoFactor(): void
    {
        $this->user->forceFill([
            'otp_secret' => null,
            'otp_required_for_login' => false,
            'otp_backup_codes' => null,
            'consumed_timestep' => null,
        ])->save();
    }

    /** @return list<string>|null Mã dự phòng sinh lần đầu; null nếu đã có sẵn. */
    public function verifyAndActivate(): ?array
    {
        return DB::transaction(function (): ?array {
            $this->user->forceFill(['otp_required_for_login' => true])->save();

            return $this->backupCodesGenerated() ? null : $this->generateBackupCodes();
        });
    }

    public function twoFactorProvisioningUri(): ?string
    {
        if (! $this->user->otp_secret) {
            return null;
        }

        $totp = TOTP::createFromSecret($this->user->otp_secret);
        $totp->setLabel($this->user->email);
        $totp->setIssuer(config('app.name'));

        return $totp->getProvisioningUri();
    }

    /** @return list<string> */
    public function generateBackupCodes(): array
    {
        $codes = [];
        for ($index = 0; $index < self::BACKUP_CODES_COUNT; $index++) {
            $codes[] = mb_strtoupper(bin2hex(random_bytes(4)));
        }

        $this->user->forceFill(['otp_backup_codes' => $codes])->save();

        return $codes;
    }

    public function validateBackupCode(?string $code): bool
    {
        $codes = $this->user->otp_backup_codes;

        if (! $codes || ! $code) {
            return false;
        }

        $foundIndex = $this->findMatchingCodeIndex($codes, $code);

        if ($foundIndex === null) {
            return false;
        }

        $codes[$foundIndex] = self::USED_BACKUP_CODE;
        $this->user->forceFill(['otp_backup_codes' => $codes])->save();

        return true;
    }

    public function backupCodesGenerated(): bool
    {
        return ! empty($this->user->otp_backup_codes);
    }

    public function remainingBackupCodesCount(): int
    {
        return count(array_filter(
            $this->user->otp_backup_codes ?? [],
            fn (string $code): bool => $code !== self::USED_BACKUP_CODE,
        ));
    }

    /** @param list<string> $codes */
    private function findMatchingCodeIndex(array $codes, string $code): ?int
    {
        $foundIndex = null;

        // Duyệt hết mảng (không break) để thời gian so sánh không lộ vị trí mã đúng.
        foreach ($codes as $index => $storedCode) {
            $isMatch = hash_equals($storedCode, $code);
            if ($isMatch && $storedCode !== self::USED_BACKUP_CODE) {
                $foundIndex = $index;
            }
        }

        return $foundIndex;
    }
}

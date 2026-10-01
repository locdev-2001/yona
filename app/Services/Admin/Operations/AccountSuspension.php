<?php

namespace App\Services\Admin\Operations;

use App\Models\Account;

// Khoá/mở account từ console. Mỗi lần khoá ghi một mốc vào
// internal_attributes.suspensions; khoá lại một account đang khoá chỉ sửa lý do
// của mốc cuối, không đẻ thêm mốc.
final class AccountSuspension
{
    public const MAX_REASON_LENGTH = 256;

    /** @return list<string> */
    public static function categories(): array
    {
        return array_keys((array) __('super_admin.account_suspension.categories'));
    }

    public function suspend(Account $account, string $category, string $reason): void
    {
        $internal = $account->internal_attributes ?? [];
        $history = $internal['suspensions'] ?? [];
        $event = ['category' => $category, 'reason' => $reason];

        if ($account->status === Account::STATUS_SUSPENDED && $history !== []) {
            $history[count($history) - 1] = [...$history[count($history) - 1], ...$event];
        } else {
            $history[] = [...$event, 'suspended_at' => now()->toIso8601String()];
        }

        $account->internal_attributes = [...$internal, 'suspensions' => $history];
        $account->status = Account::STATUS_SUSPENDED;
    }

    public function unsuspend(Account $account): void
    {
        $account->status = Account::STATUS_ACTIVE;
    }

    /** @return list<array<string, mixed>> */
    public static function history(Account $account): array
    {
        return array_values($account->internal_attributes['suspensions'] ?? []);
    }
}

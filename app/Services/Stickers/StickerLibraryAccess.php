<?php

namespace App\Services\Stickers;

use App\Models\Account;
use App\Models\Sticker;
use App\Models\User;
use App\Support\SystemAccess;

// Nguồn duy nhất của luật "ai được quản lý kho sticker nào", dùng ở trang cài
// đặt và API dashboard:
// - kho riêng của account: quản trị viên account đó, và account bật cờ
//   custom_stickers hoặc người đó có quyền hệ thống;
// - kho nền tảng (kho chung): chỉ người có quyền hệ thống.
class StickerLibraryAccess
{
    public function canManageAccountLibrary(User $user, Account $account): bool
    {
        return $this->isAdministratorOf($user, $account)
            && (SystemAccess::isSystemAdmin($user) || $account->featureEnabled(Sticker::CUSTOM_STICKERS_FEATURE));
    }

    public function canManagePlatformLibrary(User $user): bool
    {
        return SystemAccess::isSystemAdmin($user);
    }

    private function isAdministratorOf(User $user, Account $account): bool
    {
        return (bool) $account->accountUsers()->where('user_id', $user->id)->first()?->isAdministrator();
    }
}

<?php

namespace App\Services\Stickers;

use App\Models\Account;
use App\Models\User;
use App\Support\SystemAccess;

// Nguồn duy nhất của luật "ai được quản lý kho sticker nào", dùng ở trang cài
// đặt và API dashboard:
// - kho riêng của account: mọi thành viên account đó;
// - kho nền tảng (kho chung): chỉ người có quyền hệ thống;
// - chuyển bộ giữa kho nền tảng và kho riêng: người có quyền hệ thống đồng thời
//   là quản trị viên account đó.
class StickerLibraryAccess
{
    public function canManageAccountLibrary(User $user, Account $account): bool
    {
        return $account->accountUsers()->where('user_id', $user->id)->exists();
    }

    public function canManagePlatformLibrary(User $user): bool
    {
        return SystemAccess::isSystemAdmin($user);
    }

    public function canMovePacks(User $user, Account $account): bool
    {
        return $this->canManagePlatformLibrary($user) && $this->isAdministratorOf($user, $account);
    }

    private function isAdministratorOf(User $user, Account $account): bool
    {
        return (bool) $account->accountUsers()->where('user_id', $user->id)->first()?->isAdministrator();
    }
}

<?php

namespace App\Services\Stickers;

use App\Models\Account;
use App\Models\Sticker;
use App\Models\StickerMcpToken;
use App\Models\User;
use App\Support\SystemAccess;

// Nguồn duy nhất của luật "ai được quản lý kho sticker nào", dùng ở trang cài
// đặt, API dashboard, REST và MCP bằng token:
// - kho riêng của account: quản trị viên account đó, và account bật cờ
//   custom_stickers hoặc người đó có quyền hệ thống;
// - kho nền tảng (kho chung): chỉ người có quyền hệ thống.
// Token sticker được kiểm lại bằng chính luật này mỗi lần dùng.
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

    // Phạm vi token trong một account: token nền tảng cũng phải do quản trị
    // viên của account đang giữ token tạo ra, để thu hồi được từ chính account đó.
    public function canUseScope(User $user, Account $account, string $scope): bool
    {
        return match ($scope) {
            StickerMcpToken::SCOPE_ACCOUNT => $this->canManageAccountLibrary($user, $account),
            StickerMcpToken::SCOPE_PLATFORM => $this->isAdministratorOf($user, $account) && $this->canManagePlatformLibrary($user),
            default => false,
        };
    }

    /** @return list<string> */
    public function usableScopes(User $user, Account $account): array
    {
        return array_values(array_filter(
            StickerMcpToken::SCOPES,
            fn (string $scope) => $this->canUseScope($user, $account, $scope),
        ));
    }

    public function targetFor(StickerMcpToken $token): ?StickerLibraryTarget
    {
        $user = $token->user;
        $account = $token->account;

        if (! $user instanceof User || ! $account instanceof Account || ! $this->canUseScope($user, $account, $token->scope)) {
            return null;
        }

        return new StickerLibraryTarget($token->isPlatformScope() ? null : $account);
    }

    private function isAdministratorOf(User $user, Account $account): bool
    {
        return (bool) $account->accountUsers()->where('user_id', $user->id)->first()?->isAdministrator();
    }
}

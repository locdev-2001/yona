<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use App\Services\Stickers\StickerLibraryAccess;
use Tests\Support\YonaStickers;

// Ma trận quyền kho sticker: một luật dùng cho trang cài đặt và API dashboard.

function libraryAccessMember(Account $account, int $role): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);

    return $user;
}

beforeEach(function () {
    $this->access = app(StickerLibraryAccess::class);
    config(['yona.system_admin_emails' => '']);
});

it('ma trận kho riêng và kho nền tảng', function (int $role, bool $systemAdmin, bool $accountLibrary, bool $platformLibrary) {
    $account = Account::factory()->create();
    $user = libraryAccessMember($account, $role);
    if ($systemAdmin) {
        YonaStickers::grantSystemAdmin($user);
    }

    expect($this->access->canManageAccountLibrary($user, $account))->toBe($accountLibrary)
        ->and($this->access->canManagePlatformLibrary($user))->toBe($platformLibrary);
})->with([
    'quản trị viên' => [AccountUser::ROLE_ADMINISTRATOR, false, true, false],
    'quản trị viên có quyền hệ thống' => [AccountUser::ROLE_ADMINISTRATOR, true, true, true],
    'nhân viên' => [AccountUser::ROLE_AGENT, false, false, false],
    'nhân viên có quyền hệ thống' => [AccountUser::ROLE_AGENT, true, false, true],
]);

it('kho nền tảng chỉ cho người có quyền hệ thống', function () {
    $user = User::factory()->create();

    expect($this->access->canManagePlatformLibrary($user))->toBeFalse();

    YonaStickers::grantSystemAdmin($user);

    expect($this->access->canManagePlatformLibrary($user))->toBeTrue();
});

it('không phải thành viên account thì không dùng được kho riêng của account đó dù có quyền hệ thống', function () {
    $account = Account::factory()->create();
    $outsider = User::factory()->create();
    YonaStickers::grantSystemAdmin($outsider);

    expect($this->access->canManageAccountLibrary($outsider, $account))->toBeFalse();
});

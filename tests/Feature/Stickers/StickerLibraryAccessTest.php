<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\StickerMcpToken;
use App\Models\User;
use App\Services\Stickers\StickerLibraryAccess;
use Tests\Support\YonaStickers;

// Ma trận quyền kho sticker: một luật dùng cho trang cài đặt, API dashboard,
// REST và MCP bằng token.

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

it('ma trận kho riêng và kho nền tảng', function (int $role, bool $systemAdmin, bool $flag, bool $accountLibrary, bool $platformLibrary) {
    $account = Account::factory()->create();
    YonaStickers::enableCustomStickers($account, $flag);
    $user = libraryAccessMember($account->refresh(), $role);
    if ($systemAdmin) {
        YonaStickers::grantSystemAdmin($user);
    }

    expect($this->access->canManageAccountLibrary($user, $account))->toBe($accountLibrary)
        ->and($this->access->canUseScope($user, $account, StickerMcpToken::SCOPE_ACCOUNT))->toBe($accountLibrary)
        ->and($this->access->canUseScope($user, $account, StickerMcpToken::SCOPE_PLATFORM))->toBe($platformLibrary)
        ->and($this->access->usableScopes($user, $account))->toBe(array_keys(array_filter([
            StickerMcpToken::SCOPE_ACCOUNT => $accountLibrary,
            StickerMcpToken::SCOPE_PLATFORM => $platformLibrary,
        ])));
})->with([
    'quản trị viên, cờ tắt' => [AccountUser::ROLE_ADMINISTRATOR, false, false, false, false],
    'quản trị viên, cờ bật' => [AccountUser::ROLE_ADMINISTRATOR, false, true, true, false],
    'quản trị viên có quyền hệ thống, cờ tắt' => [AccountUser::ROLE_ADMINISTRATOR, true, false, true, true],
    'quản trị viên có quyền hệ thống, cờ bật' => [AccountUser::ROLE_ADMINISTRATOR, true, true, true, true],
    'nhân viên, cờ bật' => [AccountUser::ROLE_AGENT, false, true, false, false],
    'nhân viên có quyền hệ thống' => [AccountUser::ROLE_AGENT, true, true, false, false],
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

    expect($this->access->canManageAccountLibrary($outsider, $account))->toBeFalse()
        ->and($this->access->usableScopes($outsider, $account))->toBe([]);
});

it('token trỏ tới đúng kho theo phạm vi; mất quyền thì không còn kho nào', function () {
    $account = Account::factory()->create();
    $admin = libraryAccessMember($account, AccountUser::ROLE_ADMINISTRATOR);
    YonaStickers::grantSystemAdmin($admin);
    $accountToken = StickerMcpToken::issue($account, $admin, 'riêng', StickerMcpToken::SCOPE_ACCOUNT)['token'];
    $platformToken = StickerMcpToken::issue($account, $admin, 'nền tảng', StickerMcpToken::SCOPE_PLATFORM)['token'];

    expect($this->access->targetFor($accountToken)?->owner?->id)->toBe($account->id)
        ->and($this->access->targetFor($platformToken))->not->toBeNull()
        ->and($this->access->targetFor($platformToken)->owner)->toBeNull();

    config(['yona.system_admin_emails' => '']);

    expect($this->access->targetFor($accountToken->fresh()))->toBeNull()
        ->and($this->access->targetFor($platformToken->fresh()))->toBeNull();
});

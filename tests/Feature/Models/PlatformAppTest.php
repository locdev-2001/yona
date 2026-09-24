<?php

use App\Models\AccessToken;
use App\Models\Account;
use App\Models\PlatformApp;
use App\Models\PlatformAppPermissible;

it('sinh access token ngay khi tạo', function () {
    $platformApp = PlatformApp::factory()->create();

    expect($platformApp->accessToken)->not->toBeNull()
        ->and(strlen($platformApp->accessToken->token))->toBe(24);
});

it('không cấp quyền trùng cho cùng một bản ghi', function () {
    $platformApp = PlatformApp::factory()->create();
    $account = Account::factory()->create();

    $platformApp->permit($account);
    $platformApp->permit($account);

    expect(PlatformAppPermissible::query()->count())->toBe(1);
});

it('xoá app thì xoá luôn quyền và token', function () {
    $platformApp = PlatformApp::factory()->create();
    $platformApp->permit(Account::factory()->create());

    $platformApp->delete();

    expect(PlatformAppPermissible::query()->count())->toBe(0)
        ->and(AccessToken::query()->where('owner_type', 'PlatformApp')->count())->toBe(0);
});

<?php

use App\Models\AccessToken;
use App\Models\Account;
use App\Models\AgentBot;
use App\Models\PlatformApp;
use App\Models\User;

function accessTokenIdsOf(User|AgentBot|PlatformApp ...$owners): array
{
    return collect($owners)->map(fn ($owner) => $owner->accessToken->id)->sort()->values()->all();
}

function remainingAccessTokenIds(): array
{
    return AccessToken::query()->orderBy('id')->pluck('id')->all();
}

it('xoá user thì token của user đó mất, token của chủ khác còn nguyên', function () {
    $deletedUser = User::factory()->create();
    $keptUser = User::factory()->create();
    $keptBot = AgentBot::factory()->create();

    $deletedUser->delete();

    expect(AccessToken::query()->whereMorphedTo('owner', $deletedUser)->exists())->toBeFalse()
        ->and(remainingAccessTokenIds())->toBe(accessTokenIdsOf($keptUser, $keptBot));
});

it('xoá bot thì token của bot đó mất, token của chủ khác còn nguyên', function () {
    $deletedBot = AgentBot::factory()->create();
    $keptBot = AgentBot::factory()->create();
    $keptUser = User::factory()->create();
    $keptApp = PlatformApp::factory()->create();

    $deletedBot->delete();

    expect(AccessToken::query()->whereMorphedTo('owner', $deletedBot)->exists())->toBeFalse()
        ->and(remainingAccessTokenIds())->toBe(accessTokenIdsOf($keptBot, $keptUser, $keptApp));
});

it('user trùng id với bot đã xoá vẫn giữ token của mình', function () {
    $deletedBot = AgentBot::factory()->create();
    $userWithSameId = User::factory()->create(['id' => $deletedBot->id]);

    $deletedBot->delete();

    expect(remainingAccessTokenIds())->toBe(accessTokenIdsOf($userWithSameId));
});

it('xoá account thì token của bot thuộc account đó mất theo', function () {
    $deletedAccount = Account::factory()->create();
    AgentBot::factory()->create(['account_id' => $deletedAccount->id]);
    $keptBot = AgentBot::factory()->create(['account_id' => Account::factory()->create()->id]);

    $deletedAccount->delete();

    expect(remainingAccessTokenIds())->toBe(accessTokenIdsOf($keptBot));
});

<?php

use App\Models\AccessToken;
use App\Models\AgentBot;
use App\Models\User;

function orphanAccessToken(string $ownerType): AccessToken
{
    return AccessToken::query()->create(['owner_type' => $ownerType, 'owner_id' => 999_999]);
}

it('chỉ xoá token mà chủ sở hữu không còn', function () {
    $liveUser = User::factory()->create();
    $liveBot = AgentBot::factory()->create();
    orphanAccessToken('User');
    orphanAccessToken('AgentBot');
    orphanAccessToken('AgentBot');

    $this->artisan('access-tokens:prune-orphans')
        ->expectsOutputToContain('AgentBot: 2 token mồ côi')
        ->expectsOutputToContain('User: 1 token mồ côi')
        ->assertSuccessful();

    expect(AccessToken::query()->orderBy('id')->pluck('id')->all())
        ->toBe([$liveUser->accessToken->id, $liveBot->accessToken->id]);
});

it('thử chạy chỉ đếm, không xoá gì', function () {
    User::factory()->create();
    orphanAccessToken('User');

    $this->artisan('access-tokens:prune-orphans --dry-run')
        ->expectsOutputToContain('User: 1 token mồ côi')
        ->expectsOutputToContain('Thử chạy: 1 token mồ côi sẽ bị xoá.')
        ->assertSuccessful();

    expect(AccessToken::query()->count())->toBe(2);
});

it('bỏ qua loại chủ không nhận ra thay vì xoá', function () {
    orphanAccessToken('LoaiChuKhongTonTai');

    $this->artisan('access-tokens:prune-orphans')
        ->expectsOutputToContain('Bỏ qua loại chủ không nhận ra: LoaiChuKhongTonTai')
        ->assertSuccessful();

    expect(AccessToken::query()->count())->toBe(1);
});

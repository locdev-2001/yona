<?php

use App\Models\Account;
use App\Models\Sticker;
use App\Models\StickerPack;
use Illuminate\Support\Facades\Storage;

// Ai thấy sticker nào: kho chung (account_id NULL) cho mọi account, kho của
// tenant chỉ cho chính tenant đó và chỉ khi cờ custom_stickers bật. Chỉ bộ đã
// xuất bản và sticker đã xử lý xong mới hiện.

function visibleStickerIds(Account $account): array
{
    return Sticker::query()->visibleTo($account)->orderBy('id')->pluck('id')->all();
}

function accountWithCustomStickers(bool $enabled): Account
{
    return Account::factory()->create(['feature_flags' => ['custom_stickers' => $enabled]]);
}

it('shows the shared library to every account', function () {
    $shared = Sticker::factory()->create();

    expect(visibleStickerIds(accountWithCustomStickers(false)))->toBe([$shared->id])
        ->and(visibleStickerIds(accountWithCustomStickers(true)))->toBe([$shared->id]);
});

it('keeps a tenant library inside its own account', function () {
    $owner = accountWithCustomStickers(true);
    $other = accountWithCustomStickers(true);
    $ownerSticker = Sticker::factory()->for(StickerPack::factory()->forAccount($owner))->create();

    expect(visibleStickerIds($owner))->toBe([$ownerSticker->id])
        ->and(visibleStickerIds($other))->toBe([]);
});

it('hides the tenant library from its own account while the flag is off', function () {
    $account = accountWithCustomStickers(false);
    $shared = Sticker::factory()->create();
    $own = Sticker::factory()->for(StickerPack::factory()->forAccount($account))->create();

    expect(visibleStickerIds($account))->toBe([$shared->id]);

    $account->forceFill(['feature_flags' => ['custom_stickers' => true]])->save();

    expect(visibleStickerIds($account))->toBe([$shared->id, $own->id]);
});

it('keeps the flag off by default', function () {
    expect(config('features.custom_stickers'))->toBeFalse();
});

it('hides stickers of unpublished packs', function () {
    Sticker::factory()->for(StickerPack::factory()->unpublished())->create();

    expect(visibleStickerIds(accountWithCustomStickers(true)))->toBe([]);
});

it('hides stickers that are still processing or failed', function () {
    $ready = Sticker::factory()->create();
    Sticker::factory()->processing()->create();
    Sticker::factory()->failed('render_timeout')->create();

    expect(visibleStickerIds(accountWithCustomStickers(true)))->toBe([$ready->id]);
});

it('follows the owner of the pack when a sticker moves to a tenant pack', function () {
    $owner = accountWithCustomStickers(true);
    $other = accountWithCustomStickers(true);
    $sticker = Sticker::factory()->create();
    $sticker->load('stickerPack');

    $sticker->update(['sticker_pack_id' => StickerPack::factory()->forAccount($owner)->create()->id]);

    expect(visibleStickerIds($other))->toBe([])
        ->and(visibleStickerIds($owner))->toBe([$sticker->id]);
});

it('follows the owner of the pack when the pack changes hands', function () {
    $owner = accountWithCustomStickers(true);
    $other = accountWithCustomStickers(true);
    $sticker = Sticker::factory()->create();

    StickerPack::query()->whereKey($sticker->sticker_pack_id)->update(['account_id' => $owner->id]);

    expect(visibleStickerIds($other))->toBe([])
        ->and(visibleStickerIds($owner))->toBe([$sticker->id]);
});

it('builds file urls from the stickers disk when they are read', function () {
    $sticker = Sticker::factory()->create();

    config(['filesystems.disks.stickers.url' => 'https://cdn.example.test/stickers']);
    Storage::forgetDisk('stickers');

    $reloaded = $sticker->fresh();

    expect($reloaded->static_url)->toBe('https://cdn.example.test/stickers/'.$sticker->static_path)
        ->and($reloaded->poster_url)->toBe('https://cdn.example.test/stickers/'.$sticker->poster_path)
        ->and($reloaded->animation_url)->toBe('https://cdn.example.test/stickers/'.$sticker->animation_path);

    config(['filesystems.disks.stickers.url' => 'https://assets.example.test/s']);
    Storage::forgetDisk('stickers');

    expect($reloaded->static_url)->toBe('https://assets.example.test/s/'.$sticker->static_path);
});

it('has no url for a file that is not rendered yet', function () {
    $sticker = Sticker::factory()->processing()->create();

    expect($sticker->static_url)->toBeNull()
        ->and($sticker->poster_url)->toBeNull();
});

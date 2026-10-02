<?php

use App\Models\Account;
use App\Models\Sticker;
use App\Models\StickerPack;
use Illuminate\Support\Facades\Storage;

// Ai thấy sticker nào: kho chung (account_id NULL) cho mọi account, kho của
// tenant chỉ cho chính tenant đó. Chỉ bộ đã xuất bản và sticker đã xử lý xong
// mới hiện.

function visibleStickerIds(Account $account): array
{
    return Sticker::query()->visibleTo($account)->orderBy('id')->pluck('id')->all();
}

it('shows the shared library to every account', function () {
    $shared = Sticker::factory()->create();

    expect(visibleStickerIds(Account::factory()->create()))->toBe([$shared->id]);
});

it('keeps a tenant library inside its own account', function () {
    $owner = Account::factory()->create();
    $other = Account::factory()->create();
    $ownerSticker = Sticker::factory()->for(StickerPack::factory()->forAccount($owner))->create();

    expect(visibleStickerIds($owner))->toBe([$ownerSticker->id])
        ->and(visibleStickerIds($other))->toBe([]);
});

it('shows the published tenant library to its own account', function () {
    $account = Account::factory()->create();
    $shared = Sticker::factory()->create();
    $own = Sticker::factory()->for(StickerPack::factory()->forAccount($account))->create();

    expect(visibleStickerIds($account))->toBe([$shared->id, $own->id]);
});

it('hides stickers of unpublished packs', function () {
    Sticker::factory()->for(StickerPack::factory()->unpublished())->create();

    expect(visibleStickerIds(Account::factory()->create()))->toBe([]);
});

it('hides stickers that are still processing or failed', function () {
    $ready = Sticker::factory()->create();
    Sticker::factory()->processing()->create();
    Sticker::factory()->failed('render_timeout')->create();

    expect(visibleStickerIds(Account::factory()->create()))->toBe([$ready->id]);
});

it('follows the owner of the pack when a sticker moves to a tenant pack', function () {
    $owner = Account::factory()->create();
    $other = Account::factory()->create();
    $sticker = Sticker::factory()->create();
    $sticker->load('stickerPack');

    $sticker->update(['sticker_pack_id' => StickerPack::factory()->forAccount($owner)->create()->id]);

    expect(visibleStickerIds($other))->toBe([])
        ->and(visibleStickerIds($owner))->toBe([$sticker->id]);
});

it('follows the owner of the pack when the pack changes hands', function () {
    $owner = Account::factory()->create();
    $other = Account::factory()->create();
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
        ->and($reloaded->image_url)->toBe('https://cdn.example.test/stickers/'.$sticker->image_path);

    config(['filesystems.disks.stickers.url' => 'https://assets.example.test/s']);
    Storage::forgetDisk('stickers');

    expect($reloaded->static_url)->toBe('https://assets.example.test/s/'.$sticker->static_path);
});

it('has no url for a file that is not rendered yet', function () {
    $sticker = Sticker::factory()->processing()->create();

    expect($sticker->static_url)->toBeNull()
        ->and($sticker->image_url)->toBeNull();
});

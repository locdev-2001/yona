<?php

use App\Models\Account;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Models\SuperAdmin;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakeStickerRenderer;
use Tests\Support\YonaStickers;

// Super Admin quản trị kho sticker riêng của từng account bằng cùng lõi với màn Cài đặt của tenant.
beforeEach(function () {
    $this->disk = Storage::fake(Sticker::DISK);
    FakeStickerRenderer::install();
    $this->account = Account::factory()->create(['name' => 'Shop Mèo']);
    $this->api = "/admin/api/accounts/{$this->account->id}/sticker_packs";
    $this->actingAs(SuperAdmin::factory()->withMfa()->create(), 'super_admin');
});

it('mở trang kho sticker của account với gốc API riêng', function () {
    $this->get("/admin/accounts/{$this->account->id}/sticker_packs")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('superadmin/StickerPacks', false)
            ->where('apiBaseUrl', "/admin/api/accounts/{$this->account->id}")
            ->where('account.name', 'Shop Mèo')
            ->where('account.overviewUrl', "/admin/accounts/{$this->account->id}/overview"));

    $this->get('/admin/accounts/999999/sticker_packs')->assertNotFound();
});

it('tạo, đổi tên, tải lên, sửa nhãn, sắp xếp, xuất bản và xoá trong kho của account', function () {
    $packId = $this->postJson($this->api, ['name' => 'Mèo cười'])->assertCreated()->json('id');
    expect(StickerPack::query()->find($packId)->account_id)->toBe($this->account->id);

    $this->patchJson("{$this->api}/{$packId}", ['name' => 'Mèo cười to'])->assertOk()->assertJsonPath('name', 'Mèo cười to');

    $first = $this->post("{$this->api}/{$packId}/stickers", ['file' => YonaStickers::imageUpload()], ['Accept' => 'application/json'])
        ->assertCreated()->json('id');
    $second = $this->post("{$this->api}/{$packId}/stickers", ['file' => YonaStickers::animatedUpload()], ['Accept' => 'application/json'])
        ->assertCreated()->json('id');

    $this->patchJson("{$this->api}/{$packId}/stickers/{$first}", ['label' => 'Cười'])->assertOk()->assertJsonPath('label', 'Cười');
    $this->putJson("{$this->api}/{$packId}/stickers/order", ['sticker_ids' => [$second, $first]])->assertOk();
    expect(Sticker::query()->orderBy('position')->pluck('id')->all())->toBe([$second, $first]);

    $this->postJson("{$this->api}/{$packId}/publish")->assertOk()->assertJsonPath('published', true);
    $this->getJson($this->api)->assertOk()->assertJsonPath('payload.0.stickers_count', 2);

    $this->deleteJson("{$this->api}/{$packId}/stickers/{$first}")->assertOk();
    $this->deleteJson("{$this->api}/{$packId}")->assertOk();
    expect(StickerPack::query()->count())->toBe(0);
});

it('không đụng được bộ của account khác hay của kho chung qua URL account này', function () {
    $other = StickerPack::factory()->create(['account_id' => Account::factory()->create()->id]);
    $platform = StickerPack::factory()->create(['account_id' => null]);

    $this->getJson("{$this->api}/{$other->id}")->assertNotFound();
    $this->deleteJson("{$this->api}/{$platform->id}")->assertNotFound();
    expect(StickerPack::query()->count())->toBe(2);
});

it('chuyển bộ của account sang kho chung và ngược lại', function () {
    $pack = StickerPack::factory()->create(['account_id' => $this->account->id]);

    $this->postJson("{$this->api}/{$pack->id}/move", ['library' => 'platform'])->assertOk();
    expect($pack->fresh()->account_id)->toBeNull();

    $this->postJson("{$this->api}/{$pack->id}/move", ['library' => 'account'])->assertOk();
    expect($pack->fresh()->account_id)->toBe($this->account->id);
});

it('account 360 đếm kho sticker riêng', function () {
    StickerPack::factory()->count(2)->create(['account_id' => $this->account->id]);

    $this->get("/admin/accounts/{$this->account->id}/overview")
        ->assertInertia(fn ($page) => $page->where('stickers.packs', 2)->where('urls.stickers', "/admin/accounts/{$this->account->id}/sticker_packs"));
});

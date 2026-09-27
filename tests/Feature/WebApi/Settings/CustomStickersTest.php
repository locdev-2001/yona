<?php

use App\Channels\Capability;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Inbox;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Models\User;
use App\Services\Channels\Stickers\StickerLibrary;
use App\Services\Stickers\StickerLibraryManager;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakeStickerRenderer;
use Tests\Support\YonaStickers;

// Kho sticker riêng của tenant: cùng lõi với kho chung, ẩn hoàn toàn khi cờ
// custom_stickers tắt (mặc định).

function customStickersUser(Account $account, int $role = AccountUser::ROLE_ADMINISTRATOR): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);

    return $user;
}

function customStickersFixture(string $name): UploadedFile
{
    return UploadedFile::fake()->createWithContent($name, file_get_contents(base_path("tests/Fixtures/stickers/{$name}")));
}

beforeEach(function () {
    $this->disk = Storage::fake(Sticker::DISK);
    FakeStickerRenderer::install();
    $this->account = Account::factory()->create();
    $this->admin = customStickersUser($this->account);
    $this->api = "/api/v1/accounts/{$this->account->id}/sticker_packs";
});

describe('cờ custom_stickers tắt', function () {
    it('mặc định tắt', function () {
        expect($this->account->featureEnabled(Sticker::CUSTOM_STICKERS_FEATURE))->toBeFalse()
            ->and($this->account->enabledFeatures())->not->toHaveKey(Sticker::CUSTOM_STICKERS_FEATURE);
    });

    it('trang cài đặt trả 404', function () {
        $this->actingAs($this->admin)
            ->get("/app/accounts/{$this->account->id}/settings/custom-stickers")
            ->assertNotFound();
    });

    it('mọi endpoint API trả 404 và không tạo gì', function () {
        $pack = YonaStickers::tenantPack($this->account);
        $sticker = YonaStickers::ready($pack);
        $this->actingAs($this->admin);

        $this->getJson($this->api)->assertNotFound();
        $this->postJson($this->api, ['name' => 'Lén'])->assertNotFound();
        $this->getJson("{$this->api}/{$pack->id}")->assertNotFound();
        $this->patchJson("{$this->api}/{$pack->id}", ['name' => 'Lén'])->assertNotFound();
        $this->postJson("{$this->api}/{$pack->id}/publish")->assertNotFound();
        $this->post("{$this->api}/{$pack->id}/stickers", ['file' => customStickersFixture('spinner-with-precomp.tgs')], ['Accept' => 'application/json'])->assertNotFound();
        $this->putJson("{$this->api}/{$pack->id}/stickers/order", ['sticker_ids' => [$sticker->id]])->assertNotFound();
        $this->deleteJson("{$this->api}/{$pack->id}/stickers/{$sticker->id}")->assertNotFound();
        $this->deleteJson("{$this->api}/{$pack->id}")->assertNotFound();

        expect(StickerPack::query()->count())->toBe(1)
            ->and($sticker->fresh())->not->toBeNull();
    });
});

describe('cờ custom_stickers bật', function () {
    beforeEach(function () {
        YonaStickers::enableCustomStickers($this->account);
        $this->account->refresh();
    });

    it('trang cài đặt mở được cho quản trị viên', function () {
        $this->actingAs($this->admin)
            ->get("/app/accounts/{$this->account->id}/settings/custom-stickers")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/settings/customStickers/Index'));
    });

    it('nhân viên không phải quản trị viên bị chặn', function () {
        $agent = customStickersUser($this->account, AccountUser::ROLE_AGENT);

        $this->actingAs($agent)->getJson($this->api)->assertUnauthorized();
        $this->actingAs($agent)->postJson($this->api, ['name' => 'Không'])->assertUnauthorized();
        expect(StickerPack::query()->count())->toBe(0);
    });

    it('tải sticker vào kho riêng, xuất bản thì account thấy còn tenant khác không thấy', function () {
        $this->actingAs($this->admin);
        $packId = $this->postJson($this->api, ['name' => 'Mèo shop'])->assertCreated()->json('id');
        expect(StickerPack::query()->find($packId)->account_id)->toBe($this->account->id);

        $stickerId = $this->post("{$this->api}/{$packId}/stickers", ['file' => customStickersFixture('ball-with-poster-marker.json')], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('status', Sticker::STATUS_READY)
            ->json('id');
        $this->postJson("{$this->api}/{$packId}/publish")->assertOk()->assertJsonPath('published', true);

        $ownInbox = Inbox::factory()->create(['account_id' => $this->account->id]);
        $otherAccount = Account::factory()->create();
        YonaStickers::enableCustomStickers($otherAccount);
        $otherInbox = Inbox::factory()->create(['account_id' => $otherAccount->id]);
        $listingIds = fn (Inbox $inbox) => array_map(fn ($sticker) => $sticker->id, app(StickerLibrary::class)->listing($inbox->fresh(), Capability::OutboundImage));

        expect($listingIds($ownInbox))->toBe(["yona:{$stickerId}"])
            ->and($listingIds($otherInbox))->toBe([]);
    });

    it('không đụng được bộ của tenant khác hay kho chung', function () {
        $foreignPack = YonaStickers::tenantPack(Account::factory()->create());
        $globalPack = StickerPack::factory()->create();
        $this->actingAs($this->admin);

        foreach ([$foreignPack, $globalPack] as $pack) {
            $this->getJson("{$this->api}/{$pack->id}")->assertNotFound();
            $this->deleteJson("{$this->api}/{$pack->id}")->assertNotFound();
            $this->postJson("{$this->api}/{$pack->id}/publish")->assertNotFound();
        }
        expect($this->getJson($this->api)->assertOk()->json('payload'))->toBe([]);
    });

    it('tệp ác ý bị từ chối bằng đúng câu lỗi', function () {
        $pack = YonaStickers::tenantPack($this->account);

        $this->actingAs($this->admin)
            ->post("{$this->api}/{$pack->id}/stickers", ['file' => customStickersFixture('text-layer.json')], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.file.0', __('errors.sticker_uploads.text_not_allowed'));
    });

    it('xoá bộ kho riêng dọn tệp không còn ai dùng', function () {
        $pack = YonaStickers::tenantPack($this->account);
        $sticker = YonaStickers::ready($pack);

        $this->actingAs($this->admin)->deleteJson("{$this->api}/{$pack->id}")->assertOk();

        expect(StickerPack::query()->find($pack->id))->toBeNull();
        $this->disk->assertMissing($sticker->static_path);
    });

    it('giới hạn số lượt tải sticker mỗi phút của account', function () {
        $pack = YonaStickers::tenantPack($this->account);
        $this->actingAs($this->admin);
        $upload = fn () => $this->post("{$this->api}/{$pack->id}/stickers", ['file' => UploadedFile::fake()->create('khong-phai-sticker.png', 1)], ['Accept' => 'application/json']);

        foreach (range(1, StickerLibraryManager::UPLOADS_PER_MINUTE) as $ignored) {
            $upload()->assertUnprocessable();
        }

        $upload()
            ->assertTooManyRequests()
            ->assertJsonPath('message', __('errors.sticker_library.upload_throttled'))
            ->assertJsonPath('retry_after', fn ($seconds) => $seconds > 0);
        expect(Sticker::query()->count())->toBe(0);
    });

    it('lượt tải của account này không ăn vào hạn mức của account khác', function () {
        $otherAccount = Account::factory()->create();
        YonaStickers::enableCustomStickers($otherAccount);
        $otherAdmin = customStickersUser($otherAccount);
        $pack = YonaStickers::tenantPack($this->account);
        $otherPack = YonaStickers::tenantPack($otherAccount);
        $file = fn () => ['file' => UploadedFile::fake()->create('khong-phai-sticker.png', 1)];

        $this->actingAs($this->admin);
        foreach (range(1, StickerLibraryManager::UPLOADS_PER_MINUTE) as $ignored) {
            $this->post("{$this->api}/{$pack->id}/stickers", $file(), ['Accept' => 'application/json']);
        }

        $this->actingAs($otherAdmin)
            ->post("/api/v1/accounts/{$otherAccount->id}/sticker_packs/{$otherPack->id}/stickers", $file(), ['Accept' => 'application/json'])
            ->assertUnprocessable();
    });

    it('account đã đủ số bộ tối đa thì không tạo thêm bộ', function () {
        StickerPack::factory()->count(StickerLibraryManager::MAX_PACKS_PER_ACCOUNT)->forAccount($this->account)->create();

        $this->actingAs($this->admin)
            ->postJson($this->api, ['name' => 'Bộ dư'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.name.0', __('errors.sticker_library.too_many_packs', ['max' => StickerLibraryManager::MAX_PACKS_PER_ACCOUNT]));
        expect(StickerPack::query()->where('account_id', $this->account->id)->count())->toBe(StickerLibraryManager::MAX_PACKS_PER_ACCOUNT);
    });
});

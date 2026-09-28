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

// Kho sticker riêng của tenant và kho nền tảng trong Cài đặt: cùng lõi với
// console Super Admin. Kho riêng dùng được khi cờ custom_stickers bật hoặc người
// dùng có quyền hệ thống; kho nền tảng chỉ người có quyền hệ thống.

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

describe('chưa có quyền dùng kho riêng (cờ tắt, không có quyền hệ thống)', function () {
    it('cờ mặc định tắt', function () {
        expect($this->account->featureEnabled(Sticker::CUSTOM_STICKERS_FEATURE))->toBeFalse()
            ->and($this->account->enabledFeatures())->not->toHaveKey(Sticker::CUSTOM_STICKERS_FEATURE);
    });

    it('trang cài đặt vẫn mở nhưng báo khoá cả hai kho', function () {
        $this->actingAs($this->admin)
            ->get("/app/accounts/{$this->account->id}/settings/custom-stickers")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/settings/customStickers/Index')
                ->where('stickerLibraryAccess.accountLibrary', false)
                ->where('stickerLibraryAccess.platformLibrary', false));
    });

    it('mọi endpoint API trả 403 và không đổi gì', function () {
        $pack = YonaStickers::tenantPack($this->account);
        $sticker = YonaStickers::ready($pack);
        $this->actingAs($this->admin);

        $this->getJson($this->api)->assertForbidden();
        $this->postJson($this->api, ['name' => 'Lén'])->assertForbidden();
        $this->getJson("{$this->api}/{$pack->id}")->assertForbidden();
        $this->patchJson("{$this->api}/{$pack->id}", ['name' => 'Lén'])->assertForbidden();
        $this->postJson("{$this->api}/{$pack->id}/publish")->assertForbidden();
        $this->post("{$this->api}/{$pack->id}/stickers", ['file' => customStickersFixture('spinner-with-precomp.tgs')], ['Accept' => 'application/json'])->assertForbidden();
        $this->putJson("{$this->api}/{$pack->id}/stickers/order", ['sticker_ids' => [$sticker->id]])->assertForbidden();
        $this->deleteJson("{$this->api}/{$pack->id}/stickers/{$sticker->id}")->assertForbidden();
        $this->deleteJson("{$this->api}/{$pack->id}")->assertForbidden();

        expect(StickerPack::query()->count())->toBe(1)
            ->and($pack->fresh()->name)->not->toBe('Lén')
            ->and($sticker->fresh())->not->toBeNull();
    });

    it('nhân viên không phải quản trị viên vẫn nhận 401 như mọi API cài đặt', function () {
        $agent = customStickersUser($this->account, AccountUser::ROLE_AGENT);

        $this->actingAs($agent)->getJson($this->api)->assertUnauthorized();
    });
});

describe('quyền hệ thống khi cờ tắt', function () {
    beforeEach(function () {
        YonaStickers::grantSystemAdmin($this->admin);
    });

    it('trang báo mở cả kho riêng lẫn kho nền tảng', function () {
        $this->actingAs($this->admin)
            ->get("/app/accounts/{$this->account->id}/settings/custom-stickers")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('stickerLibraryAccess.accountLibrary', true)
                ->where('stickerLibraryAccess.platformLibrary', true));
    });

    it('dựng bộ trong kho riêng và account thấy ngay khi xuất bản', function () {
        $this->actingAs($this->admin);
        $packId = $this->postJson($this->api, ['name' => 'Bộ nội bộ'])->assertCreated()->json('id');
        $stickerId = $this->post("{$this->api}/{$packId}/stickers", ['file' => customStickersFixture('ball-with-poster-marker.json')], ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('id');
        $this->postJson("{$this->api}/{$packId}/publish")->assertOk();

        $inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
        $listingIds = array_map(fn ($sticker) => $sticker->id, app(StickerLibrary::class)->listing($inbox->fresh(), Capability::OutboundImage));

        expect(StickerPack::query()->find($packId)->account_id)->toBe($this->account->id)
            ->and($listingIds)->toBe(["yona:{$stickerId}"]);
    });

    it('bị gỡ khỏi danh sách thì lại nhận 403', function () {
        config(['yona.system_admin_emails' => '']);

        $this->actingAs($this->admin)->getJson($this->api)->assertForbidden();
    });
});

describe('kho nền tảng trong Cài đặt', function () {
    beforeEach(function () {
        $this->platformApi = '/api/v1/platform_sticker_library/sticker_packs';
    });

    it('quản trị viên account không có quyền hệ thống nhận 403, kể cả khi cờ bật', function () {
        YonaStickers::enableCustomStickers($this->account);
        $pack = StickerPack::factory()->create(['name' => 'Chung']);
        $this->actingAs($this->admin);

        $this->getJson($this->platformApi)->assertForbidden();
        $this->postJson($this->platformApi, ['name' => 'Lén'])->assertForbidden();
        $this->patchJson("{$this->platformApi}/{$pack->id}", ['name' => 'Lén'])->assertForbidden();
        $this->deleteJson("{$this->platformApi}/{$pack->id}")->assertForbidden();

        expect($pack->fresh()->name)->toBe('Chung');
    });

    it('chưa đăng nhập thì không vào được', function () {
        $this->getJson($this->platformApi)->assertUnauthorized();
    });

    it('người có quyền hệ thống quản lý kho nền tảng, không chạm kho riêng của tenant', function () {
        YonaStickers::grantSystemAdmin($this->admin);
        $tenantPack = YonaStickers::tenantPack(Account::factory()->create());
        $this->actingAs($this->admin);

        $packId = $this->postJson($this->platformApi, ['name' => 'Chung mới'])->assertCreated()->json('id');
        $this->post("{$this->platformApi}/{$packId}/stickers", ['file' => customStickersFixture('ball-with-poster-marker.json')], ['Accept' => 'application/json'])
            ->assertCreated();
        $this->postJson("{$this->platformApi}/{$packId}/publish")->assertOk()->assertJsonPath('published', true);

        expect(StickerPack::query()->find($packId)->account_id)->toBeNull()
            ->and(array_column($this->getJson($this->platformApi)->assertOk()->json('payload'), 'id'))->toBe([$packId]);
        $this->getJson("{$this->platformApi}/{$tenantPack->id}")->assertNotFound();
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
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/settings/customStickers/Index')
                ->where('stickerLibraryAccess.accountLibrary', true)
                ->where('stickerLibraryAccess.platformLibrary', false));
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

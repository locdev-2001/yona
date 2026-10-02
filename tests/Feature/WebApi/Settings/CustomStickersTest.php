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
// console Super Admin. Kho riêng mở cho mọi thành viên account; kho nền tảng
// chỉ người có quyền hệ thống.

function customStickersUser(Account $account, int $role = AccountUser::ROLE_ADMINISTRATOR): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);

    return $user;
}

beforeEach(function () {
    $this->disk = Storage::fake(Sticker::DISK);
    $this->renderer = FakeStickerRenderer::install();
    $this->account = Account::factory()->create();
    $this->admin = customStickersUser($this->account);
    $this->api = "/api/v1/accounts/{$this->account->id}/sticker_packs";
});

describe('quyền hệ thống', function () {
    beforeEach(function () {
        YonaStickers::grantSystemAdmin($this->admin);
    });

    it('trang báo mở thêm kho nền tảng', function () {
        $this->actingAs($this->admin)
            ->get("/app/accounts/{$this->account->id}/settings/custom-stickers")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('stickerLibraryAccess.platformLibrary', true));
    });

    it('bị gỡ khỏi danh sách thì mất kho nền tảng nhưng vẫn dùng kho riêng', function () {
        config(['yona.system_admin_emails' => '']);
        $this->actingAs($this->admin);

        $this->getJson('/api/v1/platform_sticker_library/sticker_packs')->assertForbidden();
        $this->getJson($this->api)->assertOk();
    });
});

describe('kho nền tảng trong Cài đặt', function () {
    beforeEach(function () {
        $this->platformApi = '/api/v1/platform_sticker_library/sticker_packs';
    });

    it('quản trị viên account không có quyền hệ thống nhận 403', function () {
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
        $this->post("{$this->platformApi}/{$packId}/stickers", ['file' => YonaStickers::imageUpload()], ['Accept' => 'application/json'])
            ->assertCreated();
        $this->postJson("{$this->platformApi}/{$packId}/publish")->assertOk()->assertJsonPath('published', true);

        expect(StickerPack::query()->find($packId)->account_id)->toBeNull()
            ->and(array_column($this->getJson($this->platformApi)->assertOk()->json('payload'), 'id'))->toBe([$packId]);
        $this->getJson("{$this->platformApi}/{$tenantPack->id}")->assertNotFound();
    });
});

describe('kho riêng của account', function () {
    it('trang cài đặt mở được cho quản trị viên, không có kho nền tảng', function () {
        $this->actingAs($this->admin)
            ->get("/app/accounts/{$this->account->id}/settings/custom-stickers")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/settings/customStickers/Index')
                ->where('stickerLibraryAccess.platformLibrary', false));
    });

    it('nhân viên mở được trang và dựng bộ trong kho riêng, không thấy kho nền tảng', function () {
        $agent = customStickersUser($this->account, AccountUser::ROLE_AGENT);
        $this->actingAs($agent);

        $this->get("/app/accounts/{$this->account->id}/settings/custom-stickers")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('stickerLibraryAccess.platformLibrary', false));
        $this->postJson($this->api, ['name' => 'Của nhân viên'])->assertCreated();
        $this->getJson('/api/v1/platform_sticker_library/sticker_packs')->assertForbidden();

        expect(StickerPack::query()->where('account_id', $this->account->id)->count())->toBe(1);
    });

    it('người ngoài account không vào được kho riêng', function () {
        $outsider = customStickersUser(Account::factory()->create());

        $this->actingAs($outsider)->getJson($this->api)->assertNotFound();
        expect(StickerPack::query()->count())->toBe(0);
    });

    it('tải sticker vào kho riêng, xuất bản thì account thấy còn tenant khác không thấy', function () {
        $this->actingAs($this->admin);
        $packId = $this->postJson($this->api, ['name' => 'Mèo shop'])->assertCreated()->json('id');
        expect(StickerPack::query()->find($packId)->account_id)->toBe($this->account->id);

        $stickerId = $this->post("{$this->api}/{$packId}/stickers", ['file' => YonaStickers::imageUpload()], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('status', Sticker::STATUS_READY)
            ->json('id');
        $this->postJson("{$this->api}/{$packId}/publish")->assertOk()->assertJsonPath('published', true);

        $ownInbox = Inbox::factory()->create(['account_id' => $this->account->id]);
        $otherAccount = Account::factory()->create();
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

    it('tệp không phải ảnh nhận được bị từ chối bằng đúng câu lỗi', function () {
        $pack = YonaStickers::tenantPack($this->account);

        $this->actingAs($this->admin)
            ->post("{$this->api}/{$pack->id}/stickers", ['file' => UploadedFile::fake()->createWithContent('ball.tgs', gzencode('{}'))], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.file.0', __('errors.sticker_uploads.unsupported_file_type'));
    });

    it('tải ảnh kèm thông số cắt + xoá nền: trả sticker với URL ảnh WebP và PNG, lưu thông số để dựng lại', function () {
        $pack = YonaStickers::tenantPack($this->account);
        $edit = ['crop' => ['x' => 0, 'y' => 0, 'w' => 0.5, 'h' => 0.5], 'removeBackground' => true, 'tolerance' => 20, 'feather' => 1, 'edits' => [['op' => 'brush-keep', 'points' => [[0.4, 0.4]], 'radius' => 0.05]]];

        $response = $this->actingAs($this->admin)
            ->post("{$this->api}/{$pack->id}/stickers", ['file' => YonaStickers::imageUpload(), 'edit' => json_encode($edit), 'label' => 'Chấm', 'keywords' => ['chấm']], ['Accept' => 'application/json'])
            ->assertCreated();

        $sticker = Sticker::query()->findOrFail($response->json('id'));
        expect($response->json())->toBe([
            'id' => $sticker->id,
            'label' => 'Chấm',
            'keywords' => ['chấm'],
            'status' => Sticker::STATUS_READY,
            'failure_message' => null,
            'position' => 0,
            'width' => Sticker::imageSize(),
            'height' => Sticker::imageSize(),
            'frames' => 1,
            'image_url' => $sticker->image_url,
            'static_url' => $sticker->static_url,
            'edit' => $sticker->edit_params,
            'has_original' => true,
            'existing' => false,
        ])
            ->and($sticker->edit_params)->toEqual($edit)
            ->and($this->renderer->calls[0]['edit'])->toEqual($edit);
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

it('trang dashboard nhận cạnh hiển thị sticker từ config qua shared prop', function () {
    config(['yona.stickers.display_size' => 72]);

    $this->actingAs($this->admin)
        ->get("/app/accounts/{$this->account->id}/settings/custom-stickers")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('stickerDisplaySize', 72));
});

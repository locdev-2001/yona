<?php

use App\Models\Account;
use App\Models\PlatformApp;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakeStickerRenderer;
use Tests\Support\YonaStickers;

// Kho sticker chung qua Platform API: cùng action với console Super Admin, chỉ kho chung.

const PLATFORM_STICKER_API = '/platform/api/v1/sticker_packs';

beforeEach(function () {
    Storage::fake(Sticker::DISK);
    FakeStickerRenderer::install();
    $this->headers = ['api_access_token' => PlatformApp::factory()->create()->accessToken->token];
});

it('token sai hay thiếu thì 401 và không tạo gì', function (array $headers) {
    $this->postJson(PLATFORM_STICKER_API, ['name' => 'Lén'], $headers)->assertUnauthorized();

    expect(StickerPack::query()->count())->toBe(0);
})->with([
    'thiếu token' => [[]],
    'token sai' => [['api_access_token' => 'sai-token']],
    'bearer sai' => [['Authorization' => 'Bearer sai-token']],
]);

it('token của user thường (không phải Platform App) bị từ chối', function () {
    $user = User::factory()->create();

    $this->getJson(PLATFORM_STICKER_API, ['api_access_token' => $user->accessToken->token])->assertUnauthorized();
});

it('dựng trọn một bộ kho chung: tạo, tải kèm từ khoá, sửa, xuất bản, xoá sticker', function () {
    $packId = $this->postJson(PLATFORM_STICKER_API, ['name' => 'Bộ AI'], $this->headers)
        ->assertCreated()
        ->assertJsonPath('published', false)
        ->json('id');
    expect(StickerPack::query()->find($packId)->account_id)->toBeNull();

    $stickerId = $this->post(PLATFORM_STICKER_API."/{$packId}/stickers", [
        'file' => UploadedFile::fake()->createWithContent('ball.json', file_get_contents(base_path('tests/Fixtures/stickers/ball-with-poster-marker.json'))),
        'label' => 'Bóng',
        'keywords' => ['Bóng'],
    ], [...$this->headers, 'Accept' => 'application/json'])
        ->assertCreated()
        ->assertJsonPath('status', Sticker::STATUS_READY)
        ->assertJsonPath('keywords', ['bóng'])
        ->json('id');

    $this->patchJson(PLATFORM_STICKER_API."/{$packId}/stickers/{$stickerId}", ['keywords' => ['nảy']], $this->headers)
        ->assertOk()
        ->assertJsonPath('label', 'Bóng')
        ->assertJsonPath('keywords', ['nảy']);

    $this->postJson(PLATFORM_STICKER_API."/{$packId}/publish", [], $this->headers)->assertOk()->assertJsonPath('published', true);
    $this->getJson(PLATFORM_STICKER_API, $this->headers)->assertOk()->assertJsonPath('payload.0.id', $packId);

    $this->deleteJson(PLATFORM_STICKER_API."/{$packId}/stickers/{$stickerId}", [], $this->headers)->assertOk();
    expect(Sticker::query()->find($stickerId))->toBeNull();
});

it('nhận token qua Authorization: Bearer', function () {
    $token = $this->headers['api_access_token'];

    $this->getJson(PLATFORM_STICKER_API, ['Authorization' => "Bearer {$token}"])->assertOk();
});

it('không chạm được kho riêng của tenant', function () {
    $tenantPack = YonaStickers::tenantPack(Account::factory()->create());
    $sticker = YonaStickers::ready($tenantPack, ['label' => 'Giữ']);

    $this->getJson(PLATFORM_STICKER_API."/{$tenantPack->id}", $this->headers)->assertNotFound();
    $this->patchJson(PLATFORM_STICKER_API."/{$tenantPack->id}/stickers/{$sticker->id}", ['label' => 'Lén'], $this->headers)->assertNotFound();
    $this->deleteJson(PLATFORM_STICKER_API."/{$tenantPack->id}", [], $this->headers)->assertNotFound();

    expect($sticker->fresh()->label)->toBe('Giữ')
        ->and($this->getJson(PLATFORM_STICKER_API, $this->headers)->json('payload'))->toBe([]);
});

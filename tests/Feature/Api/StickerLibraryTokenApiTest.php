<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\PlatformApp;
use App\Models\Sticker;
use App\Models\StickerMcpToken;
use App\Models\StickerPack;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakeStickerRenderer;
use Tests\Support\YonaStickers;

// REST kho sticker bằng token sticker: token kho riêng chỉ chạm kho của account
// tạo token, token nền tảng chỉ chạm kho chung; quyền kiểm lại mỗi lần gọi.

const STICKER_LIBRARY_API = '/api/v1/sticker_library/sticker_packs';

function stickerTokenAdmin(Account $account): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => AccountUser::ROLE_ADMINISTRATOR]);

    return $user;
}

function stickerTokenHeaders(string $token): array
{
    return ['Authorization' => "Bearer {$token}", 'Accept' => 'application/json'];
}

beforeEach(function () {
    Storage::fake(Sticker::DISK);
    FakeStickerRenderer::install();
    config(['yona.system_admin_emails' => '']);
    $this->account = Account::factory()->create();
    $this->admin = stickerTokenAdmin($this->account);
});

it('thiếu token, token sai hay đã thu hồi thì 401', function () {
    YonaStickers::enableCustomStickers($this->account);
    $revoked = YonaStickers::issueToken($this->account, $this->admin);
    StickerMcpToken::query()->delete();

    $this->getJson(STICKER_LIBRARY_API)->assertUnauthorized()->assertHeader('WWW-Authenticate', 'Bearer');
    $this->getJson(STICKER_LIBRARY_API, stickerTokenHeaders('yst_sai'))->assertUnauthorized();
    $this->getJson(STICKER_LIBRARY_API, stickerTokenHeaders($revoked))->assertUnauthorized();
});

it('token Platform App hay token user thường không vào được', function () {
    $platformToken = PlatformApp::factory()->create()->accessToken->token;

    $this->getJson(STICKER_LIBRARY_API, stickerTokenHeaders($platformToken))->assertUnauthorized();
    $this->getJson(STICKER_LIBRARY_API, ['api_access_token' => $platformToken])->assertUnauthorized();
    $this->getJson(STICKER_LIBRARY_API, stickerTokenHeaders($this->admin->accessToken->token))->assertUnauthorized();
});

it('route Platform API cho kho sticker không còn', function () {
    $platformToken = PlatformApp::factory()->create()->accessToken->token;

    $this->getJson('/platform/api/v1/sticker_packs', ['api_access_token' => $platformToken])->assertNotFound();
});

it('token kho riêng dựng bộ trong đúng account, cập nhật lần dùng cuối', function () {
    YonaStickers::enableCustomStickers($this->account);
    $token = YonaStickers::issueToken($this->account, $this->admin);
    $headers = stickerTokenHeaders($token);

    $packId = $this->postJson(STICKER_LIBRARY_API, ['name' => 'Bộ AI'], $headers)->assertCreated()->json('id');
    $stickerId = $this->post(STICKER_LIBRARY_API."/{$packId}/stickers", [
        'file' => UploadedFile::fake()->createWithContent('ball.json', file_get_contents(base_path('tests/Fixtures/stickers/ball-with-poster-marker.json'))),
        'keywords' => ['Bóng'],
    ], $headers)->assertCreated()->assertJsonPath('keywords', ['bóng'])->json('id');
    $this->patchJson(STICKER_LIBRARY_API."/{$packId}/stickers/{$stickerId}", ['label' => 'Bóng'], $headers)->assertOk()->assertJsonPath('label', 'Bóng');
    $this->postJson(STICKER_LIBRARY_API."/{$packId}/publish", [], $headers)->assertOk()->assertJsonPath('published', true);

    expect(StickerPack::query()->find($packId)->account_id)->toBe($this->account->id)
        ->and(StickerMcpToken::query()->sole()->last_used_at)->not->toBeNull();
});

it('token kho riêng không chạm kho của account khác hay kho chung', function () {
    YonaStickers::enableCustomStickers($this->account);
    $headers = stickerTokenHeaders(YonaStickers::issueToken($this->account, $this->admin));
    $own = YonaStickers::tenantPack($this->account);
    $foreignPack = YonaStickers::tenantPack(Account::factory()->create());
    $globalPack = StickerPack::factory()->create(['name' => 'Chung']);

    expect(array_column($this->getJson(STICKER_LIBRARY_API, $headers)->assertOk()->json('payload'), 'id'))->toBe([$own->id]);
    foreach ([$foreignPack, $globalPack] as $pack) {
        $this->getJson(STICKER_LIBRARY_API."/{$pack->id}", $headers)->assertNotFound();
        $this->patchJson(STICKER_LIBRARY_API."/{$pack->id}", ['name' => 'Lén'], $headers)->assertNotFound();
        $this->deleteJson(STICKER_LIBRARY_API."/{$pack->id}", [], $headers)->assertNotFound();
    }

    expect($globalPack->fresh()->name)->toBe('Chung')
        ->and($foreignPack->fresh())->not->toBeNull();
});

it('token nền tảng chỉ chạm kho chung', function () {
    YonaStickers::grantSystemAdmin($this->admin);
    $headers = stickerTokenHeaders(YonaStickers::issueToken($this->account, $this->admin, StickerMcpToken::SCOPE_PLATFORM));
    $tenantPack = YonaStickers::tenantPack($this->account);

    $packId = $this->postJson(STICKER_LIBRARY_API, ['name' => 'Chung AI'], $headers)->assertCreated()->json('id');

    expect(StickerPack::query()->find($packId)->account_id)->toBeNull()
        ->and(array_column($this->getJson(STICKER_LIBRARY_API, $headers)->json('payload'), 'id'))->toBe([$packId]);
    $this->getJson(STICKER_LIBRARY_API."/{$tenantPack->id}", $headers)->assertNotFound();
});

it('mất quyền sau khi tạo token thì 403 và không đổi gì', function (Closure $revoke, string $scope) {
    YonaStickers::grantSystemAdmin($this->admin);
    YonaStickers::enableCustomStickers($this->account);
    $headers = stickerTokenHeaders(YonaStickers::issueToken($this->account, $this->admin, $scope));

    $revoke($this->account, $this->admin);

    $this->postJson(STICKER_LIBRARY_API, ['name' => 'Lén'], $headers)->assertForbidden();
    expect(StickerPack::query()->count())->toBe(0);
})->with([
    'email bị gỡ khỏi danh sách (token nền tảng)' => [fn () => config(['yona.system_admin_emails' => '']), StickerMcpToken::SCOPE_PLATFORM],
    'bị hạ xuống nhân viên (token kho riêng)' => [fn (Account $account, User $user) => AccountUser::query()->where('user_id', $user->id)->update(['role' => AccountUser::ROLE_AGENT]), StickerMcpToken::SCOPE_ACCOUNT],
    'bị gỡ khỏi account (token nền tảng)' => [fn (Account $account, User $user) => AccountUser::query()->where('user_id', $user->id)->delete(), StickerMcpToken::SCOPE_PLATFORM],
]);

it('cờ tắt và không có quyền hệ thống thì token kho riêng bị 403', function () {
    YonaStickers::enableCustomStickers($this->account);
    $headers = stickerTokenHeaders(YonaStickers::issueToken($this->account, $this->admin));
    YonaStickers::enableCustomStickers($this->account, false);

    $this->getJson(STICKER_LIBRARY_API, $headers)->assertForbidden();
});

it('xoá người tạo hay account thì token hết hiệu lực', function () {
    YonaStickers::enableCustomStickers($this->account);
    $token = YonaStickers::issueToken($this->account, $this->admin);

    $this->admin->delete();

    $this->getJson(STICKER_LIBRARY_API, stickerTokenHeaders($token))->assertUnauthorized();
});

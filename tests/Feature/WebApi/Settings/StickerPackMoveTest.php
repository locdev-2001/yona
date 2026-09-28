<?php

use App\Http\Resources\MessageResource;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Message;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Models\User;
use App\Services\Stickers\StickerLibraryAccess;
use App\Services\Stickers\StickerLibraryManager;
use Illuminate\Support\Facades\Storage;
use Tests\Support\YonaStickers;

// Chuyển bộ sticker giữa kho nền tảng và kho riêng của account đang mở.

function stickerMoveMember(Account $account, int $role = AccountUser::ROLE_ADMINISTRATOR): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);

    return $user;
}

beforeEach(function () {
    config(['yona.system_admin_emails' => '']);
    $this->disk = Storage::fake(Sticker::DISK);
    $this->account = Account::factory()->create();
    $this->admin = stickerMoveMember($this->account);
    YonaStickers::grantSystemAdmin($this->admin);
    $this->moveUrl = fn (StickerPack $pack) => "/api/v1/accounts/{$this->account->id}/sticker_packs/{$pack->id}/move";
});

it('đưa bộ kho nền tảng về kho riêng: cuối kho, giữ xuất bản, sticker và tệp', function () {
    StickerPack::factory()->forAccount($this->account)->create(['position' => 4]);
    $pack = StickerPack::factory()->create(['name' => 'Chung', 'position' => 0]);
    $sticker = YonaStickers::ready($pack);
    $publishedAt = $pack->published_at;

    $this->actingAs($this->admin)
        ->postJson(($this->moveUrl)($pack), ['library' => 'account'])
        ->assertOk()
        ->assertJsonPath('id', $pack->id)
        ->assertJsonPath('published', true)
        ->assertJsonPath('stickers.0.id', $sticker->id)
        ->assertJsonStructure(['meta' => ['max_stickers']]);

    $pack->refresh();
    expect($pack->account_id)->toBe($this->account->id)
        ->and($pack->position)->toBe(5)
        ->and($pack->published_at->equalTo($publishedAt))->toBeTrue()
        ->and($pack->stickers()->pluck('id')->all())->toBe([$sticker->id])
        ->and($this->disk->exists($sticker->image_path))->toBeTrue()
        ->and($this->disk->exists($sticker->static_path))->toBeTrue();
});

it('đưa bộ kho riêng lên kho nền tảng: cuối kho, giữ nháp', function () {
    StickerPack::factory()->create(['position' => 7]);
    $pack = StickerPack::factory()->forAccount($this->account)->unpublished()->create();
    YonaStickers::ready($pack);

    $this->actingAs($this->admin)
        ->postJson(($this->moveUrl)($pack), ['library' => 'platform'])
        ->assertOk()
        ->assertJsonPath('published', false);

    $pack->refresh();
    expect($pack->account_id)->toBeNull()
        ->and($pack->position)->toBe(8)
        ->and($pack->published_at)->toBeNull()
        ->and($pack->stickers()->count())->toBe(1);
});

it('tin đã gửi từ bộ vẫn đọc được ảnh sau khi chuyển', function () {
    $otherAccount = Account::factory()->create();
    $pack = StickerPack::factory()->create();
    $sticker = YonaStickers::ready($pack);
    $message = Message::factory()->create([
        'account_id' => $otherAccount->id,
        'content_type' => Message::CONTENT_TYPES['sticker'],
        'content_attributes' => ['sticker' => YonaStickers::storedPayload($sticker)],
    ]);

    $this->actingAs($this->admin)->postJson(($this->moveUrl)($pack), ['library' => 'account'])->assertOk();

    $reader = MessageResource::contentAttributes($message->fresh())['sticker'];
    expect($reader)->toBe(YonaStickers::readerPayload($sticker->fresh()))
        ->and($this->disk->exists($sticker->static_path))->toBeTrue();
});

it('quản trị viên account không có quyền hệ thống nhận 403, kể cả khi cờ bật', function () {
    YonaStickers::enableCustomStickers($this->account);
    $admin = stickerMoveMember($this->account);
    $pack = StickerPack::factory()->create();

    $this->actingAs($admin)->postJson(($this->moveUrl)($pack), ['library' => 'account'])->assertForbidden();

    expect($pack->fresh()->account_id)->toBeNull();
});

it('người có quyền hệ thống nhưng chỉ là nhân viên của account nhận 403', function () {
    $agent = stickerMoveMember($this->account, AccountUser::ROLE_AGENT);
    YonaStickers::grantSystemAdmin($agent);
    $pack = YonaStickers::tenantPack($this->account);

    $this->actingAs($agent)->postJson(($this->moveUrl)($pack), ['library' => 'platform'])->assertForbidden();

    expect($pack->fresh()->account_id)->toBe($this->account->id);
});

it('bộ không nằm ở kho nguồn thì 404 và không đổi gì', function (string $library, Closure $makePack) {
    $pack = $makePack($this->account);

    $this->actingAs($this->admin)->postJson(($this->moveUrl)($pack), ['library' => $library])->assertNotFound();

    expect($pack->fresh()->account_id)->toBe($pack->account_id);
})->with([
    'lên nền tảng: bộ của account khác' => ['platform', fn () => YonaStickers::tenantPack(Account::factory()->create())],
    'lên nền tảng: bộ đã ở kho nền tảng' => ['platform', fn () => StickerPack::factory()->create()],
    'về kho riêng: bộ của account khác' => ['account', fn () => YonaStickers::tenantPack(Account::factory()->create())],
    'về kho riêng: bộ đã ở kho riêng' => ['account', fn (Account $account) => YonaStickers::tenantPack($account)],
]);

it('kho đích sai hoặc thiếu thì 422', function (array $body) {
    $pack = StickerPack::factory()->create();

    $this->actingAs($this->admin)
        ->postJson(($this->moveUrl)($pack), $body)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('library');
})->with([
    'kho lạ' => [['library' => 'global']],
    'thiếu' => [[]],
]);

it('kho riêng đã đủ số bộ thì không nhận thêm bộ chuyển về', function () {
    StickerPack::factory()->forAccount($this->account)->count(StickerLibraryManager::MAX_PACKS_PER_ACCOUNT)->create();
    $pack = StickerPack::factory()->create();

    $this->actingAs($this->admin)
        ->postJson(($this->moveUrl)($pack), ['library' => 'account'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('library');

    expect($pack->fresh()->account_id)->toBeNull();
});

it('quyền chuyển bộ cần cả quyền hệ thống lẫn vai trò quản trị viên account', function () {
    $access = app(StickerLibraryAccess::class);
    $plainAdmin = stickerMoveMember($this->account);
    $outsider = User::factory()->create();
    YonaStickers::grantSystemAdmin($outsider);

    expect($access->canMovePacks($this->admin, $this->account))->toBeTrue()
        ->and($access->canMovePacks($plainAdmin, $this->account))->toBeFalse()
        ->and($access->canMovePacks($outsider, $this->account))->toBeFalse();
});

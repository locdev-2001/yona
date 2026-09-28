<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Models\SuperAdmin;
use App\Models\User;
use App\Services\Stickers\StickerTags;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakeStickerRenderer;
use Tests\Support\YonaStickers;

// Sửa nhãn + từ khoá sticker (PATCH) và upload kèm từ khoá, ở cả kho chung của
// Super Admin lẫn kho riêng của tenant — cùng một action qua concern chung.

const EDITING_SUPER_ADMIN_API = '/super_admin/api/sticker_packs';

function editingFixture(string $name): UploadedFile
{
    return UploadedFile::fake()->createWithContent($name, file_get_contents(base_path("tests/Fixtures/stickers/{$name}")));
}

function editingTenantUser(Account $account, int $role): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);

    return $user;
}

beforeEach(function () {
    Storage::fake(Sticker::DISK);
    FakeStickerRenderer::install();
});

describe('kho chung (Super Admin)', function () {
    beforeEach(function () {
        $this->actingAs(SuperAdmin::factory()->withMfa()->create(), 'super_admin');
        $this->pack = StickerPack::factory()->create();
    });

    it('PATCH sửa nhãn và từ khoá, trả LibraryStickerResource có keywords', function () {
        $sticker = YonaStickers::ready($this->pack, ['label' => 'Cũ']);

        $this->patchJson(EDITING_SUPER_ADMIN_API."/{$this->pack->id}/stickers/{$sticker->id}", [
            'label' => ' Mèo cảm ơn ',
            'keywords' => ['Cảm ơn', 'thanks', 'cảm ơn'],
        ])
            ->assertOk()
            ->assertJsonPath('id', $sticker->id)
            ->assertJsonPath('label', 'Mèo cảm ơn')
            ->assertJsonPath('keywords', ['cảm ơn', 'thanks'])
            ->assertJsonPath('status', Sticker::STATUS_READY);

        expect($sticker->fresh()->keywords)->toBe(['cảm ơn', 'thanks']);
    });

    it('PATCH chỉ gửi một khoá thì khoá kia giữ nguyên; label null thì xoá nhãn', function () {
        $sticker = YonaStickers::ready($this->pack, ['label' => 'Giữ', 'keywords' => ['giữ']]);
        $url = EDITING_SUPER_ADMIN_API."/{$this->pack->id}/stickers/{$sticker->id}";

        $this->patchJson($url, ['keywords' => ['mới']])->assertOk()->assertJsonPath('label', 'Giữ');
        $this->patchJson($url, ['label' => null])->assertOk()->assertJsonPath('keywords', ['mới'])->assertJsonPath('label', null);
    });

    it('PATCH từ chối quá số từ hay từ quá dài bằng 422', function (array $keywords, string $errorKey) {
        $sticker = YonaStickers::ready($this->pack);

        $this->patchJson(EDITING_SUPER_ADMIN_API."/{$this->pack->id}/stickers/{$sticker->id}", ['keywords' => $keywords])
            ->assertUnprocessable()
            ->assertJsonValidationErrors($errorKey);
    })->with([
        'quá số từ' => [array_map(fn (int $index) => "w{$index}", range(0, StickerTags::MAX_KEYWORDS)), 'keywords'],
        'từ quá dài' => [[str_repeat('a', StickerTags::MAX_KEYWORD_LENGTH + 1)], 'keywords.0'],
        'không phải chuỗi' => [[['lồng']], 'keywords.0'],
    ]);

    it('PATCH sticker của bộ khác hay của kho riêng thì 404', function () {
        $otherPack = StickerPack::factory()->create();
        $foreign = YonaStickers::ready($otherPack);
        $tenantSticker = YonaStickers::ready(YonaStickers::tenantPack(Account::factory()->create()));

        $this->patchJson(EDITING_SUPER_ADMIN_API."/{$this->pack->id}/stickers/{$foreign->id}", ['label' => 'x'])->assertNotFound();
        $this->patchJson(EDITING_SUPER_ADMIN_API."/{$tenantSticker->sticker_pack_id}/stickers/{$tenantSticker->id}", ['label' => 'x'])->assertNotFound();
    });

    it('upload nhận keywords[] kèm tệp và trả keywords trong chi tiết bộ', function () {
        $this->post(EDITING_SUPER_ADMIN_API."/{$this->pack->id}/stickers", [
            'file' => editingFixture('ball-with-poster-marker.json'),
            'label' => 'Bóng',
            'keywords' => ['Bóng', 'nảy'],
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('keywords', ['bóng', 'nảy']);

        $this->getJson(EDITING_SUPER_ADMIN_API."/{$this->pack->id}")
            ->assertOk()
            ->assertJsonPath('stickers.0.keywords', ['bóng', 'nảy']);
    });

    it('người chưa đăng nhập Super Admin không sửa được', function () {
        $sticker = YonaStickers::ready($this->pack, ['label' => 'Giữ']);
        auth('super_admin')->logout();

        $this->patchJson(EDITING_SUPER_ADMIN_API."/{$this->pack->id}/stickers/{$sticker->id}", ['label' => 'Lén'])->assertUnauthorized();
        expect($sticker->fresh()->label)->toBe('Giữ');
    });
});

describe('kho riêng (tenant)', function () {
    beforeEach(function () {
        $this->account = Account::factory()->create();
        $this->admin = editingTenantUser($this->account, AccountUser::ROLE_ADMINISTRATOR);
        $this->pack = YonaStickers::tenantPack($this->account);
        $this->sticker = YonaStickers::ready($this->pack, ['label' => 'Giữ']);
        $this->url = "/api/v1/accounts/{$this->account->id}/sticker_packs/{$this->pack->id}/stickers/{$this->sticker->id}";
    });

    it('cờ custom_stickers tắt thì PATCH trả 404 và không đổi gì', function () {
        $this->actingAs($this->admin)->patchJson($this->url, ['label' => 'Lén', 'keywords' => ['lén']])->assertNotFound();

        expect($this->sticker->fresh()->label)->toBe('Giữ')
            ->and($this->sticker->fresh()->keywords)->toBe([]);
    });

    it('cờ bật thì quản trị viên sửa được', function () {
        YonaStickers::enableCustomStickers($this->account);

        $this->actingAs($this->admin)->patchJson($this->url, ['label' => 'Mèo shop', 'keywords' => ['Chào']])
            ->assertOk()
            ->assertJsonPath('label', 'Mèo shop')
            ->assertJsonPath('keywords', ['chào']);
    });

    it('cờ bật nhưng nhân viên thường thì bị chặn', function () {
        YonaStickers::enableCustomStickers($this->account);
        $agent = editingTenantUser($this->account, AccountUser::ROLE_AGENT);

        $this->actingAs($agent)->patchJson($this->url, ['label' => 'Lén'])->assertUnauthorized();
        expect($this->sticker->fresh()->label)->toBe('Giữ');
    });

    it('không sửa được sticker kho chung hay của tenant khác', function () {
        YonaStickers::enableCustomStickers($this->account);
        $global = YonaStickers::ready(StickerPack::factory()->create());
        $foreign = YonaStickers::ready(YonaStickers::tenantPack(Account::factory()->create()));
        $this->actingAs($this->admin);

        foreach ([$global, $foreign] as $sticker) {
            $this->patchJson("/api/v1/accounts/{$this->account->id}/sticker_packs/{$sticker->sticker_pack_id}/stickers/{$sticker->id}", ['label' => 'Lén'])
                ->assertNotFound();
            expect($sticker->fresh()->label)->not->toBe('Lén');
        }
    });
});

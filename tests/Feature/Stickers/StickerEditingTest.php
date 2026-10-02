<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Message;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Models\SuperAdmin;
use App\Models\User;
use App\Services\Stickers\StickerFileLayout;
use App\Services\Stickers\StickerLibraryManager;
use App\Services\Stickers\StickerRenderer;
use App\Services\Stickers\StickerTags;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakeStickerRenderer;
use Tests\Support\YonaStickers;

// Sửa nhãn + từ khoá sticker (PATCH), chỉnh lại ảnh từ ảnh gốc đã lưu (PATCH kèm
// `edit`) và upload kèm từ khoá, ở cả kho chung của Super Admin lẫn kho riêng của
// tenant — cùng một action qua concern chung.

const EDITING_SUPER_ADMIN_API = '/admin/api/sticker_packs';

function editingTenantUser(Account $account, int $role): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);

    return $user;
}

function editingBorrowedByMessage(Sticker $sticker): void
{
    $message = Message::factory()->create();
    $message->attachments()->create([
        'account_id' => $message->account_id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'disk' => Sticker::DISK,
        'path' => (string) $sticker->static_path,
        'filename' => basename((string) $sticker->static_path),
        'content_type' => 'image/png',
    ]);
}

beforeEach(function () {
    $this->disk = Storage::fake(Sticker::DISK);
    $this->renderer = FakeStickerRenderer::install();
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
            'file' => YonaStickers::imageUpload('ball.png'),
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

    it('quản trị viên sửa được', function () {

        $this->actingAs($this->admin)->patchJson($this->url, ['label' => 'Mèo shop', 'keywords' => ['Chào']])
            ->assertOk()
            ->assertJsonPath('label', 'Mèo shop')
            ->assertJsonPath('keywords', ['chào']);
    });

    it('nhân viên cũng sửa được', function () {
        $agent = editingTenantUser($this->account, AccountUser::ROLE_AGENT);

        $this->actingAs($agent)->patchJson($this->url, ['label' => 'Của nhân viên'])->assertOk();
        expect($this->sticker->fresh()->label)->toBe('Của nhân viên');
    });

    it('không sửa được sticker kho chung hay của tenant khác', function () {
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

describe('chỉnh lại ảnh sticker đã lưu', function () {
    beforeEach(function () {
        $this->account = Account::factory()->create();
        $this->actingAs(editingTenantUser($this->account, AccountUser::ROLE_ADMINISTRATOR));
        $this->pack = YonaStickers::tenantPack($this->account);
        $this->pack->update(['published_at' => now()]);
        YonaStickers::ready($this->pack, ['position' => 0]);
        $this->sticker = YonaStickers::ready($this->pack, ['label' => 'Mèo', 'keywords' => ['mèo'], 'position' => 1]);
        $this->previous = $this->sticker->only(['content_hash', 'image_path', 'static_path', 'gif_path', 'original_path']);
        $this->url = "/api/v1/accounts/{$this->account->id}/sticker_packs/{$this->pack->id}/stickers/{$this->sticker->id}";
        $this->edit = ['crop' => ['x' => 0.1, 'y' => 0.1, 'w' => 0.8, 'h' => 0.8], 'removeBackground' => false, 'tolerance' => 20, 'feather' => 0, 'edits' => []];
    });

    it('bộ đã xuất bản: dựng lại từ ảnh gốc, giữ id, vị trí, nhãn, từ khoá; tệp mới, tệp cũ còn vì tin đã gửi trỏ tới', function () {
        editingBorrowedByMessage($this->sticker);
        $originalBytes = $this->disk->get($this->previous['original_path']);

        $this->patchJson($this->url, ['edit' => json_encode($this->edit)])
            ->assertOk()
            ->assertJsonPath('id', $this->sticker->id)
            ->assertJsonPath('position', 1)
            ->assertJsonPath('label', 'Mèo')
            ->assertJsonPath('keywords', ['mèo'])
            ->assertJsonPath('status', Sticker::STATUS_READY)
            ->assertJsonPath('failure_message', null)
            ->assertJsonPath('edit', fn (array $edit) => $edit == $this->edit);

        $sticker = $this->sticker->fresh();
        expect($sticker->content_hash)->not->toBe($this->previous['content_hash'])
            ->and($sticker->edit_params)->toEqual($this->edit)
            ->and($sticker->image_path)->toBe(StickerFileLayout::renderedPaths($sticker->content_hash)['image_path'])
            ->and(dirname($sticker->original_path))->toBe(StickerFileLayout::directory($sticker->content_hash))
            ->and($this->renderer->calls[0]['edit'])->toEqual($this->edit)
            ->and($this->renderer->calls[0]['image_bytes'])->toBe($originalBytes);
        $this->disk->assertExists([$sticker->image_path, $sticker->static_path, $sticker->original_path]);
        $this->disk->assertExists(array_values(array_diff_key($this->previous, ['content_hash' => true])));
    });

    it('không tin nào trỏ tới bản cũ thì dọn thư mục tệp cũ', function () {
        $this->patchJson($this->url, ['edit' => json_encode($this->edit)])->assertOk();

        $this->disk->assertMissing([$this->previous['static_path'], $this->previous['original_path']]);
        $this->disk->assertExists($this->sticker->fresh()->static_path);
    });

    it('nhãn, từ khoá và ảnh sửa cùng một lượt', function () {
        $this->patchJson($this->url, ['edit' => json_encode($this->edit), 'label' => 'Mèo mới', 'keywords' => ['mới']])
            ->assertOk()
            ->assertJsonPath('label', 'Mèo mới')
            ->assertJsonPath('keywords', ['mới'])
            ->assertJsonPath('edit', fn (array $edit) => $edit == $this->edit);
    });

    it('dựng hỏng thì sticker giữ bản cũ, báo lỗi, không bỏ lại tệp dở', function () {
        $this->renderer->scenario = fn () => ['failure' => StickerRenderer::IMAGE_EMPTY];

        $this->patchJson($this->url, ['edit' => json_encode($this->edit)])
            ->assertOk()
            ->assertJsonPath('status', Sticker::STATUS_READY)
            ->assertJsonPath('failure_message', __('errors.sticker_uploads.image_empty'))
            ->assertJsonPath('edit', null);

        $sticker = $this->sticker->fresh();
        expect($sticker->only(array_keys($this->previous)))->toBe($this->previous)
            ->and(Sticker::query()->visibleTo($this->account)->whereKey($sticker->id)->exists())->toBeTrue()
            ->and(collect($this->disk->allFiles())->map(StickerFileLayout::contentHashOf(...))->unique()->sort()->values()->all())
            ->toBe(Sticker::query()->pluck('content_hash')->sort()->values()->all());
        $this->disk->assertExists(array_values(array_diff_key($this->previous, ['content_hash' => true])));
    });

    it('thông số chỉnh sai hợp đồng bị từ chối như lúc tải lên, không đổi gì', function (string $edit) {
        $this->patchJson($this->url, ['edit' => $edit, 'label' => 'Lén'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.edit.0', __('errors.sticker_uploads.invalid_edit'));

        expect($this->sticker->fresh()->only(['content_hash', 'label']))->toBe(['content_hash' => $this->previous['content_hash'], 'label' => 'Mèo'])
            ->and($this->renderer->calls)->toBe([]);
    })->with([
        'JSON hỏng' => ['{'],
        'crop ngoài ảnh' => [json_encode(['crop' => ['x' => 2, 'y' => 0, 'w' => 0.5, 'h' => 0.5]])],
        'removeBackground không phải boolean' => [json_encode(['removeBackground' => 'có'])],
    ]);

    it('cùng thông số với sticker khác trong bộ thì báo trùng', function () {
        $this->patchJson($this->url, ['edit' => json_encode($this->edit)])->assertOk();
        $other = YonaStickers::ready($this->pack, ['position' => 2]);
        $this->disk->put($other->original_path, $this->disk->get($this->sticker->fresh()->original_path));

        $this->patchJson("/api/v1/accounts/{$this->account->id}/sticker_packs/{$this->pack->id}/stickers/{$other->id}", ['edit' => json_encode($this->edit)])
            ->assertUnprocessable()
            ->assertJsonPath('errors.edit.0', __('errors.sticker_uploads.duplicate_in_pack'));
    });

    it('sticker đang dựng hay mất ảnh gốc thì không chỉnh lại được', function () {
        $processing = Sticker::factory()->processing()->for($this->pack, 'stickerPack')->create(['position' => 3]);
        $withoutOriginal = YonaStickers::legacyLottie($this->pack, ['position' => 4]);
        $urlOf = fn (Sticker $sticker) => "/api/v1/accounts/{$this->account->id}/sticker_packs/{$this->pack->id}/stickers/{$sticker->id}";

        $this->patchJson($urlOf($processing), ['edit' => json_encode($this->edit)])
            ->assertUnprocessable()
            ->assertJsonPath('errors.edit.0', __('errors.sticker_uploads.sticker_busy'));
        $this->patchJson($urlOf($withoutOriginal), ['edit' => json_encode($this->edit)])
            ->assertUnprocessable()
            ->assertJsonPath('errors.edit.0', __('errors.sticker_uploads.original_missing'));
    });

    it('ảnh gốc tải qua API của đúng kho, sticker kho khác thì 404', function () {
        $foreign = YonaStickers::ready(YonaStickers::tenantPack(Account::factory()->create()));

        $response = $this->get("{$this->url}/original")->assertOk();
        expect($response->streamedContent())->toBe($this->disk->get($this->previous['original_path']));
        $this->get("/api/v1/accounts/{$this->account->id}/sticker_packs/{$foreign->sticker_pack_id}/stickers/{$foreign->id}/original")->assertNotFound();
    });

    it('kho chung của Super Admin cũng chỉnh lại được', function () {
        $this->actingAs(SuperAdmin::factory()->withMfa()->create(), 'super_admin');
        $globalPack = StickerPack::factory()->create();
        $global = YonaStickers::ready($globalPack);

        $this->patchJson(EDITING_SUPER_ADMIN_API."/{$globalPack->id}/stickers/{$global->id}", ['edit' => json_encode($this->edit)])
            ->assertOk()
            ->assertJsonPath('edit', fn (array $edit) => $edit == $this->edit);
        $this->get(EDITING_SUPER_ADMIN_API."/{$globalPack->id}/stickers/{$global->id}/original")->assertOk();
    });

    it('sửa nhãn không kèm edit không tính vào hạn mức dựng sticker', function () {
        foreach (range(1, StickerLibraryManager::UPLOADS_PER_MINUTE + 1) as $attempt) {
            $this->patchJson($this->url, ['label' => "Mèo {$attempt}"])->assertOk();
        }
    });
});

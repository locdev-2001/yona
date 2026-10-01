<?php

use App\Builders\Messages\MessageBuilder;
use App\Channels\Capability;
use App\Http\Requests\Stickers\StickerPackRequest;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Models\SuperAdmin;
use App\Models\User;
use App\Services\Channels\Stickers\StickerLibrary;
use App\Services\Stickers\StickerFileLayout;
use App\Services\Stickers\StickerLibraryManager;
use App\Services\Stickers\StickerTags;
use App\Services\Stickers\StickerUploadService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakeStickerRenderer;
use Tests\Support\YonaStickers;

// Super Admin dựng kho sticker chung từ đầu tới xuất bản mà không đụng DB.

const SUPER_ADMIN_STICKER_API = '/admin/api/sticker_packs';

function stickerListingIds(Inbox $inbox): array
{
    return array_map(fn ($sticker) => $sticker->id, app(StickerLibrary::class)->listing($inbox, Capability::OutboundImage));
}

beforeEach(function () {
    $this->disk = Storage::fake(Sticker::DISK);
    FakeStickerRenderer::install();
    $this->superAdmin = SuperAdmin::factory()->withMfa()->create();
    $this->actingAs($this->superAdmin, 'super_admin');
});

it('mở trang kho sticker trong console quản trị', function () {
    $this->get('/admin/sticker_packs')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('superadmin/StickerPacks', false)->where('apiBaseUrl', '/admin/api'));
});

it('mục menu kho sticker của console dịch sẵn ở máy chủ', function () {
    $this->get('/admin/sticker_packs')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('superAdmin.toolPages.0.label', __('sticker_library.MENU'))
            ->where('superAdmin.toolPages.0.url', '/admin/sticker_packs'));
});

it('chặn người chưa đăng nhập Super Admin', function () {
    auth('super_admin')->logout();

    $this->getJson(SUPER_ADMIN_STICKER_API)->assertUnauthorized();
    $this->postJson(SUPER_ADMIN_STICKER_API, ['name' => 'Lén'])->assertUnauthorized();
    expect(StickerPack::query()->count())->toBe(0);
});

it('tạo bộ, tải ảnh kèm thông số cắt, dựng xong rồi xuất bản thì mọi hộp thư thấy sticker', function () {
    $packId = $this->postJson(SUPER_ADMIN_STICKER_API, ['name' => ' Chó vui '])
        ->assertCreated()
        ->assertJsonPath('name', 'Chó vui')
        ->assertJsonPath('published', false)
        ->json('id');
    expect(StickerPack::query()->find($packId)->account_id)->toBeNull();

    $edit = ['crop' => ['x' => 0.1, 'y' => 0.1, 'w' => 0.8, 'h' => 0.8], 'removeBackground' => true, 'tolerance' => 12];
    $stickerId = $this->post(SUPER_ADMIN_STICKER_API."/{$packId}/stickers", ['file' => YonaStickers::animatedUpload(), 'edit' => json_encode($edit)], ['Accept' => 'application/json'])
        ->assertCreated()
        ->assertJsonPath('status', Sticker::STATUS_READY)
        ->assertJsonPath('failure_message', null)
        ->json('id');
    $sticker = Sticker::query()->findOrFail($stickerId);
    expect($sticker->edit_params)->toEqual($edit);
    foreach ([...StickerFileLayout::renderedPaths($sticker->content_hash), $sticker->original_path] as $path) {
        $this->disk->assertExists($path);
    }

    $inbox = Inbox::factory()->create();
    expect(stickerListingIds($inbox))->toBe([]);

    $this->postJson(SUPER_ADMIN_STICKER_API."/{$packId}/publish")->assertOk()->assertJsonPath('published', true);
    expect(stickerListingIds($inbox))->toBe(["yona:{$stickerId}"]);

    $this->getJson(SUPER_ADMIN_STICKER_API)
        ->assertOk()
        ->assertJsonPath('payload.0.stickers_count', 1)
        ->assertJsonPath('payload.0.cover_url', $sticker->image_url)
        ->assertJsonPath('meta', [
            'max_upload_kb' => 10 * 1024,
            'accepted_extensions' => ['png', 'jpg', 'jpeg', 'webp', 'gif'],
            'image_size' => Sticker::imageSize(),
            'max_label_length' => StickerTags::MAX_LABEL_LENGTH,
            'max_keywords' => StickerTags::MAX_KEYWORDS,
            'max_keyword_length' => StickerTags::MAX_KEYWORD_LENGTH,
            'max_stickers' => StickerLibraryManager::MAX_STICKERS_PER_PACK,
            'max_pack_name_length' => StickerPackRequest::MAX_NAME_LENGTH,
        ]);

    $this->postJson(SUPER_ADMIN_STICKER_API."/{$packId}/unpublish")->assertOk()->assertJsonPath('published', false);
    expect(stickerListingIds($inbox))->toBe([]);
});

it('chi tiết bộ mang cùng meta giới hạn với danh sách, đúng số trong luật kiểm', function () {
    $pack = StickerPack::factory()->create();
    $listingMeta = $this->getJson(SUPER_ADMIN_STICKER_API)->assertOk()->json('meta');

    foreach ([
        $this->getJson(SUPER_ADMIN_STICKER_API."/{$pack->id}"),
        $this->patchJson(SUPER_ADMIN_STICKER_API."/{$pack->id}", ['name' => 'Tên mới']),
    ] as $response) {
        $response->assertOk()->assertJsonPath('meta', $listingMeta);
    }
    $this->postJson(SUPER_ADMIN_STICKER_API, ['name' => 'Bộ mới'])->assertCreated()->assertJsonPath('meta', $listingMeta);

    expect(StickerTags::validationRules()['label'])->toContain('max:'.$listingMeta['max_label_length'])
        ->and(StickerTags::validationRules()['keywords'])->toContain('max:'.$listingMeta['max_keywords'])
        ->and(StickerTags::validationRules()['keywords.*'])->toContain('max:'.$listingMeta['max_keyword_length'])
        ->and(StickerPackRequest::nameRules()['name'])->toContain('max:'.$listingMeta['max_pack_name_length']);
});

it('tải lại đúng ảnh và thông số chỉnh đã có trong bộ: 200 kèm existing và sticker cũ, không ghi đè nhãn', function () {
    $pack = StickerPack::factory()->create();
    $edit = json_encode(['fit' => 'contain']);
    $url = SUPER_ADMIN_STICKER_API."/{$pack->id}/stickers";

    $firstId = $this->post($url, ['file' => YonaStickers::imageUpload(), 'edit' => $edit, 'label' => 'Sao'], ['Accept' => 'application/json'])
        ->assertCreated()
        ->assertJsonPath('existing', false)
        ->json('id');

    $this->post($url, ['file' => YonaStickers::imageUpload(), 'edit' => $edit, 'label' => 'Sao lần hai', 'keywords' => ['sao']], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('existing', true)
        ->assertJsonPath('id', $firstId)
        ->assertJsonPath('label', 'Sao')
        ->assertJsonPath('position', 0);

    $this->post($url, ['file' => YonaStickers::imageUpload(), 'edit' => json_encode(['fit' => 'cover'])], ['Accept' => 'application/json'])
        ->assertCreated()
        ->assertJsonPath('existing', false);
    expect($pack->stickers()->count())->toBe(2);
});

it('lỗi 422 của nhãn, từ khoá và tên bộ nằm đúng khoá trường, câu dễ hiểu', function () {
    $pack = StickerPack::factory()->create();
    $sticker = YonaStickers::ready($pack);
    $stickerUrl = SUPER_ADMIN_STICKER_API."/{$pack->id}/stickers/{$sticker->id}";
    $longKeyword = str_repeat('a', StickerTags::MAX_KEYWORD_LENGTH + 1);

    $this->patchJson($stickerUrl, ['label' => str_repeat('n', StickerTags::MAX_LABEL_LENGTH + 1)])
        ->assertUnprocessable()
        ->assertJsonPath('errors.label.0', __('errors.sticker_library.label_too_long', ['max' => StickerTags::MAX_LABEL_LENGTH]));
    $this->patchJson($stickerUrl, ['keywords' => array_map(fn ($index) => "tu{$index}", range(1, StickerTags::MAX_KEYWORDS + 1))])
        ->assertUnprocessable()
        ->assertJsonPath('errors.keywords.0', __('errors.sticker_library.too_many_keywords', ['max' => StickerTags::MAX_KEYWORDS]));
    $keywordErrors = $this->patchJson($stickerUrl, ['keywords' => ['ổn', $longKeyword]])->assertUnprocessable()->json('errors');
    expect(array_keys($keywordErrors))->toBe(['keywords.1'])
        ->and($keywordErrors['keywords.1'][0])->toBe(__('errors.sticker_library.keyword_too_long', ['max' => StickerTags::MAX_KEYWORD_LENGTH, 'input' => $longKeyword]));
    $this->post(SUPER_ADMIN_STICKER_API."/{$pack->id}/stickers", ['file' => YonaStickers::imageUpload(), 'keywords' => [$longKeyword]], ['Accept' => 'application/json'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('keywords.0');
    $this->postJson(SUPER_ADMIN_STICKER_API, ['name' => str_repeat('b', StickerPackRequest::MAX_NAME_LENGTH + 1)])
        ->assertUnprocessable()
        ->assertJsonPath('errors.name.0', __('errors.sticker_library.pack_name_too_long', ['max' => StickerPackRequest::MAX_NAME_LENGTH]));
    $this->postJson(SUPER_ADMIN_STICKER_API, ['name' => ''])
        ->assertUnprocessable()
        ->assertJsonPath('errors.name.0', __('errors.sticker_library.pack_name_required'));
});

it('tệp không phải ảnh nhận được hoặc thông số chỉnh sai bị từ chối bằng đúng câu lỗi, không tạo sticker', function (Closure $payload, string $field, string $code) {
    $pack = StickerPack::factory()->unpublished()->create();

    $this->post(SUPER_ADMIN_STICKER_API."/{$pack->id}/stickers", $payload(), ['Accept' => 'application/json'])
        ->assertUnprocessable()
        ->assertJsonPath("errors.{$field}.0", __("errors.sticker_uploads.{$code}", StickerUploadService::limitPlaceholders()));
    expect(Sticker::query()->count())->toBe(0);
})->with([
    'Lottie' => [fn () => ['file' => UploadedFile::fake()->createWithContent('ball.json', '{"v":"5.7.4"}')], 'file', 'unsupported_file_type'],
    'đội lốt PNG' => [fn () => ['file' => UploadedFile::fake()->createWithContent('evil.png', '<?php echo 1;')], 'file', 'unsupported_file_type'],
    'thông số chỉnh hỏng' => [fn () => ['file' => YonaStickers::imageUpload(), 'edit' => '{"crop":{"x":2}}'], 'edit', 'invalid_edit'],
]);

it('đòi phải có tệp và tên bộ', function () {
    $pack = StickerPack::factory()->create();

    $this->postJson(SUPER_ADMIN_STICKER_API."/{$pack->id}/stickers", [])->assertUnprocessable()->assertJsonValidationErrors('file');
    $this->postJson(SUPER_ADMIN_STICKER_API, ['name' => ''])->assertUnprocessable()->assertJsonValidationErrors('name');
});

it('sticker render hỏng hiện trạng thái lỗi kèm câu i18n', function () {
    $sticker = Sticker::factory()->failed('render_timeout')->create();

    $this->getJson(SUPER_ADMIN_STICKER_API."/{$sticker->sticker_pack_id}")
        ->assertOk()
        ->assertJsonPath('stickers.0.status', Sticker::STATUS_FAILED)
        ->assertJsonPath('stickers.0.failure_message', __('errors.sticker_uploads.render_timeout'));
});

it('sticker kẹt processing quá hạn hiện là lỗi để người quản trị tải lại', function () {
    $sticker = Sticker::factory()->processing()->create();
    Sticker::query()->whereKey($sticker->id)->update(['updated_at' => now()->subHour()]);

    $this->getJson(SUPER_ADMIN_STICKER_API."/{$sticker->sticker_pack_id}")
        ->assertJsonPath('stickers.0.status', Sticker::STATUS_FAILED)
        ->assertJsonPath('stickers.0.failure_message', __('errors.sticker_uploads.render_timeout'));
});

it('đổi tên bộ và sắp xếp sticker theo thứ tự gửi lên', function () {
    $pack = StickerPack::factory()->create(['name' => 'Cũ']);
    $first = YonaStickers::ready($pack, ['position' => 0]);
    $second = YonaStickers::ready($pack, ['position' => 1]);
    $foreign = YonaStickers::ready();

    $this->patchJson(SUPER_ADMIN_STICKER_API."/{$pack->id}", ['name' => 'Mới'])->assertOk()->assertJsonPath('name', 'Mới');

    $this->putJson(SUPER_ADMIN_STICKER_API."/{$pack->id}/stickers/order", ['sticker_ids' => [$second->id, $foreign->id, $first->id]])
        ->assertOk()
        ->assertJsonPath('stickers.0.id', $second->id)
        ->assertJsonPath('stickers.1.id', $first->id);
    expect($foreign->fresh()->position)->toBe($foreign->position);
});

it('xoá sticker chưa từng gửi thì dọn luôn tệp', function () {
    $sticker = YonaStickers::ready();

    $this->deleteJson(SUPER_ADMIN_STICKER_API."/{$sticker->sticker_pack_id}/stickers/{$sticker->id}")->assertOk();

    expect(Sticker::query()->find($sticker->id))->toBeNull();
    $this->disk->assertMissing($sticker->static_path);
    $this->disk->assertMissing($sticker->image_path);
    $this->disk->assertMissing($sticker->original_path);
});

it('xoá sticker đã gửi: tin cũ vẫn hiện ảnh, bảng chọn không còn sticker', function () {
    Queue::fake();
    $sticker = YonaStickers::ready();
    $account = Account::factory()->create();
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $agent->id, 'role' => AccountUser::ROLE_ADMINISTRATOR]);
    $this->actingAs($agent);
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $conversation = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);
    $message = (new MessageBuilder($agent, $conversation, ['content_type' => 'sticker', 'sticker_id' => "yona:{$sticker->id}"]))->perform();
    $this->actingAs($this->superAdmin, 'super_admin');

    $this->deleteJson(SUPER_ADMIN_STICKER_API."/{$sticker->sticker_pack_id}/stickers/{$sticker->id}")->assertOk();

    expect(stickerListingIds($inbox))->toBe([]);
    $attachment = Message::query()->findOrFail($message->id)->attachments()->sole();
    expect($attachment->path)->toBe($sticker->static_path);
    foreach ([$sticker->static_path, $sticker->image_path, $sticker->original_path] as $path) {
        $this->disk->assertExists($path);
    }
});

it('xoá bộ dọn tệp không còn ai dùng, giữ tệp còn bộ khác dùng chung', function () {
    $pack = StickerPack::factory()->create();
    $alone = YonaStickers::ready($pack);
    $shared = YonaStickers::ready($pack);
    Sticker::factory()->for(StickerPack::factory(), 'stickerPack')->create(['content_hash' => $shared->content_hash]);

    $this->deleteJson(SUPER_ADMIN_STICKER_API."/{$pack->id}")->assertOk();

    expect(StickerPack::query()->find($pack->id))->toBeNull();
    $this->disk->assertMissing($alone->static_path);
    $this->disk->assertExists($shared->static_path);
});

it('không đụng được bộ kho riêng của tenant', function () {
    $tenantPack = YonaStickers::tenantPack(Account::factory()->create());

    $this->getJson(SUPER_ADMIN_STICKER_API."/{$tenantPack->id}")->assertNotFound();
    $this->deleteJson(SUPER_ADMIN_STICKER_API."/{$tenantPack->id}")->assertNotFound();
    expect(collect($this->getJson(SUPER_ADMIN_STICKER_API)->json('payload'))->pluck('id'))->not->toContain($tenantPack->id);
});

it('xoá account dọn tệp kho riêng không còn đính kèm nào giữ', function () {
    $account = Account::factory()->create();
    $sticker = YonaStickers::ready(YonaStickers::tenantPack($account));

    $account->delete();

    expect(Attachment::query()->where('disk', Sticker::DISK)->count())->toBe(0);
    $this->disk->assertMissing($sticker->static_path);
});

it('xoá account dọn tệp kho riêng kể cả sticker đã gửi, giữ tệp kho chung', function () {
    Queue::fake();
    auth('super_admin')->logout();
    $account = Account::factory()->create();
    YonaStickers::enableCustomStickers($account);
    $tenantSticker = YonaStickers::ready(YonaStickers::tenantPack($account));
    $globalSticker = YonaStickers::ready();
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $agent->id, 'role' => AccountUser::ROLE_ADMINISTRATOR]);
    $conversation = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => Inbox::factory()->create(['account_id' => $account->id])->id]);
    $this->actingAs($agent, 'web');
    foreach ([$tenantSticker, $globalSticker] as $sticker) {
        (new MessageBuilder($agent, $conversation, ['content_type' => 'sticker', 'sticker_id' => "yona:{$sticker->id}"]))->perform();
    }
    expect(Attachment::query()->where('disk', Sticker::DISK)->count())->toBe(2);

    $account->delete();

    foreach ([$tenantSticker->static_path, $tenantSticker->image_path, $tenantSticker->original_path] as $path) {
        $this->disk->assertMissing($path);
    }
    $this->disk->assertExists($globalSticker->static_path);
});

it('xoá bộ kiểm tham chiếu tệp bằng số truy vấn cố định, không lặp theo từng sticker', function (int $stickerCount) {
    $pack = StickerPack::factory()->create();
    foreach (range(1, $stickerCount) as $ignored) {
        YonaStickers::ready($pack);
    }
    DB::flushQueryLog();
    DB::enableQueryLog();

    $this->deleteJson(SUPER_ADMIN_STICKER_API."/{$pack->id}")->assertOk();

    $attachmentLookups = collect(DB::getQueryLog())->filter(fn (array $entry) => str_contains($entry['query'], 'from "attachments" where "disk"'));
    expect($attachmentLookups)->toHaveCount(1);
})->with([1, 6]);

it('index riêng phần cho đường dẫn tệp sticker trong attachments', function () {
    $definition = (string) DB::selectOne("SELECT indexdef FROM pg_indexes WHERE indexname = 'index_attachments_on_sticker_path'")?->indexdef;

    expect($definition)->toContain('(path)')->toContain("'stickers'");
});

it('bộ đã đủ số sticker tối đa thì từ chối tải thêm', function () {
    $pack = StickerPack::factory()->create();
    Sticker::factory()->count(StickerLibraryManager::MAX_STICKERS_PER_PACK)->for($pack, 'stickerPack')->create();

    $this->post(SUPER_ADMIN_STICKER_API."/{$pack->id}/stickers", ['file' => YonaStickers::imageUpload()], ['Accept' => 'application/json'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.file.0', __('errors.sticker_library.pack_full', ['max' => StickerLibraryManager::MAX_STICKERS_PER_PACK]));
    expect($pack->stickers()->count())->toBe(StickerLibraryManager::MAX_STICKERS_PER_PACK);
});

it('bộ đã đầy mà tải lại ảnh đã có thì trả sticker cũ (existing) thay vì báo đầy', function () {
    $pack = StickerPack::factory()->create();
    Sticker::factory()->count(StickerLibraryManager::MAX_STICKERS_PER_PACK - 1)->for($pack, 'stickerPack')->create();
    $this->post(SUPER_ADMIN_STICKER_API."/{$pack->id}/stickers", ['file' => YonaStickers::imageUpload(seed: 7)], ['Accept' => 'application/json'])->assertCreated();

    $this->post(SUPER_ADMIN_STICKER_API."/{$pack->id}/stickers", ['file' => YonaStickers::imageUpload(seed: 7)], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('existing', true);
    expect($pack->stickers()->count())->toBe(StickerLibraryManager::MAX_STICKERS_PER_PACK);
});

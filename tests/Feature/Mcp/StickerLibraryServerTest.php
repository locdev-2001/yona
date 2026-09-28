<?php

use App\Mcp\Resources\LottieAuthoringGuide;
use App\Mcp\Servers\StickerLibraryServer;
use App\Mcp\Tools\Stickers\CreateStickerPack;
use App\Mcp\Tools\Stickers\DeleteSticker;
use App\Mcp\Tools\Stickers\GetStickerPack;
use App\Mcp\Tools\Stickers\ListStickerPacks;
use App\Mcp\Tools\Stickers\RenameStickerPack;
use App\Mcp\Tools\Stickers\SetStickerPackPublished;
use App\Mcp\Tools\Stickers\UpdateSticker;
use App\Mcp\Tools\Stickers\UploadSticker;
use App\Models\Account;
use App\Models\PlatformApp;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Services\Stickers\LottieDocumentValidator;
use App\Services\Stickers\StickerLibraryManager;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\Fluent\AssertableJson;
use Illuminate\Testing\TestResponse;
use Tests\Support\FakeStickerRenderer;
use Tests\Support\YonaStickers;

// MCP kho sticker chung: mỗi tool đi qua StickerLibraryManager/StickerUploadService
// như upload tay; route HTTP /mcp/stickers xác thực bằng token Platform App.

function mcpStickerFixture(string $name): string
{
    return file_get_contents(base_path("tests/Fixtures/stickers/{$name}"));
}

/** @param array<string, mixed> $params */
function mcpCall(string $token, string $method, array $params = [], int $id = 1): TestResponse
{
    return test()->postJson(StickerLibraryServer::PATH, ['jsonrpc' => '2.0', 'id' => $id, 'method' => $method, 'params' => $params], [
        'Authorization' => "Bearer {$token}",
        'Accept' => 'application/json, text/event-stream',
    ]);
}

beforeEach(function () {
    Storage::fake(Sticker::DISK);
    FakeStickerRenderer::install();
    RateLimiter::clear('mcp-sticker-uploads:platform-app:local');
});

describe('tools', function () {
    it('đăng ký đủ 8 tool và resource hướng dẫn Lottie', function () {
        StickerLibraryServer::tools()->assertRegistered([
            ListStickerPacks::class, GetStickerPack::class, CreateStickerPack::class, RenameStickerPack::class,
            UploadSticker::class, UpdateSticker::class, SetStickerPackPublished::class, DeleteSticker::class,
        ]);
        StickerLibraryServer::resources()->assertRegistered(LottieAuthoringGuide::class);
    });

    it('list_sticker_packs chỉ liệt kê kho chung kèm giới hạn', function () {
        $global = StickerPack::factory()->create(['name' => 'Chung']);
        YonaStickers::tenantPack(Account::factory()->create());

        StickerLibraryServer::tool(ListStickerPacks::class)
            ->assertOk()
            ->assertStructuredContent(fn (AssertableJson $json) => $json
                ->has('packs', 1)
                ->where('packs.0.id', $global->id)
                ->where('packs.0.name', 'Chung')
                ->where('limits.max_upload_kb', intdiv(LottieDocumentValidator::MAX_UPLOAD_BYTES, 1024))
                ->where('limits.max_stickers_per_pack', StickerLibraryManager::MAX_STICKERS_PER_PACK)
                ->etc());
    });

    it('create_sticker_pack tạo bộ kho chung chưa xuất bản; tên rỗng thì báo lỗi', function () {
        StickerLibraryServer::tool(CreateStickerPack::class, ['name' => ' Bộ AI '])
            ->assertOk()
            ->assertStructuredContent(fn (AssertableJson $json) => $json->where('name', 'Bộ AI')->where('published', false)->etc());

        expect(StickerPack::query()->sole()->account_id)->toBeNull();

        StickerLibraryServer::tool(CreateStickerPack::class, ['name' => ''])->assertHasErrors();
        expect(StickerPack::query()->count())->toBe(1);
    });

    it('rename_sticker_pack đổi tên; bộ của tenant thì không tìm thấy', function () {
        $pack = StickerPack::factory()->create(['name' => 'Cũ']);
        $tenantPack = YonaStickers::tenantPack(Account::factory()->create());

        StickerLibraryServer::tool(RenameStickerPack::class, ['pack_id' => $pack->id, 'name' => 'Mới'])->assertOk();
        StickerLibraryServer::tool(RenameStickerPack::class, ['pack_id' => $tenantPack->id, 'name' => 'Lén'])
            ->assertHasErrors([__('errors.sticker_library.not_found')]);

        expect($pack->fresh()->name)->toBe('Mới')
            ->and($tenantPack->fresh()->name)->not->toBe('Lén');
    });

    it('upload_sticker nhận lottie_json, lưu nhãn + từ khoá đã chuẩn hoá, render xong thì ready', function () {
        $pack = StickerPack::factory()->create();

        StickerLibraryServer::tool(UploadSticker::class, [
            'pack_id' => $pack->id,
            'lottie_json' => mcpStickerFixture('ball-with-poster-marker.json'),
            'label' => 'Bóng nảy',
            'keywords' => ['Bóng', 'nảy', 'bóng'],
        ])
            ->assertOk()
            ->assertStructuredContent(fn (AssertableJson $json) => $json
                ->where('status', Sticker::STATUS_READY)
                ->where('label', 'Bóng nảy')
                ->where('keywords', ['bóng', 'nảy'])
                ->etc());

        expect($pack->stickers()->sole()->keywords)->toBe(['bóng', 'nảy']);
    });

    it('upload_sticker nhận tgs_base64 và mẫu Lottie của hướng dẫn', function () {
        $pack = StickerPack::factory()->create();

        StickerLibraryServer::tool(UploadSticker::class, ['pack_id' => $pack->id, 'tgs_base64' => base64_encode(mcpStickerFixture('spinner-with-precomp.tgs'))])->assertOk();
        StickerLibraryServer::tool(UploadSticker::class, ['pack_id' => $pack->id, 'lottie_json' => LottieAuthoringGuide::MINIMAL_EXAMPLE])->assertOk();

        expect($pack->stickers()->where('status', Sticker::STATUS_READY)->count())->toBe(2);
    });

    it('upload_sticker trả câu lỗi của cổng kiểm và không tạo sticker', function (array $arguments, string $message) {
        $pack = StickerPack::factory()->create();

        StickerLibraryServer::tool(UploadSticker::class, ['pack_id' => $pack->id, ...$arguments])->assertHasErrors([$message]);

        expect(Sticker::query()->count())->toBe(0);
    })->with([
        'lớp chữ' => [fn () => ['lottie_json' => mcpStickerFixture('text-layer.json')], fn () => __('errors.sticker_uploads.text_not_allowed')],
        'expression' => [fn () => ['lottie_json' => mcpStickerFixture('expression.json')], fn () => __('errors.sticker_uploads.expression_not_allowed')],
        'base64 hỏng' => [['tgs_base64' => '***không-phải-base64***'], fn () => __('errors.sticker_library.invalid_base64')],
        'gửi cả hai' => [fn () => ['lottie_json' => '{}', 'tgs_base64' => 'e30='], 'lottie json'],
        'không gửi gì' => [[], 'lottie json'],
    ]);

    // Chuỗi '!' không phải base64: nếu được giải mã sẽ ra lỗi base64 hỏng, nên
    // gặp lỗi độ dài nghĩa là đã chặn trước khi giải mã.
    it('upload_sticker từ chối chuỗi vượt trần kích thước trước khi giải mã', function (string $field, Closure $maxLength) {
        $pack = StickerPack::factory()->create();
        $limit = $maxLength();

        StickerLibraryServer::tool(UploadSticker::class, ['pack_id' => $pack->id, $field => str_repeat('!', $limit + 1)])
            ->assertHasErrors([(string) $limit])
            ->assertDontSee(__('errors.sticker_library.invalid_base64'));
        expect(Sticker::query()->count())->toBe(0);
    })->with([
        'lottie_json' => ['lottie_json', fn () => LottieDocumentValidator::MAX_UPLOAD_BYTES],
        'tgs_base64' => ['tgs_base64', fn () => intdiv(LottieDocumentValidator::MAX_UPLOAD_BYTES + 2, 3) * 4],
    ]);

    it('upload_sticker để tgs_base64 dài đúng trần đi tiếp tới bước giải mã', function () {
        $pack = StickerPack::factory()->create();
        $limit = intdiv(LottieDocumentValidator::MAX_UPLOAD_BYTES + 2, 3) * 4;

        StickerLibraryServer::tool(UploadSticker::class, ['pack_id' => $pack->id, 'tgs_base64' => str_repeat('!', $limit)])
            ->assertHasErrors([__('errors.sticker_library.invalid_base64')]);
    });

    it('upload_sticker vượt nhịp tải thì báo chờ', function () {
        $pack = StickerPack::factory()->create();
        foreach (range(1, StickerLibraryManager::UPLOADS_PER_MINUTE) as $attempt) {
            RateLimiter::hit('mcp-sticker-uploads:platform-app:local', 60);
        }

        StickerLibraryServer::tool(UploadSticker::class, ['pack_id' => $pack->id, 'lottie_json' => mcpStickerFixture('ball-with-poster-marker.json')])
            ->assertHasErrors([__('errors.sticker_library.upload_throttled')]);
        expect(Sticker::query()->count())->toBe(0);
    });

    it('get_sticker_pack kèm trạng thái từng sticker và câu lỗi khi hỏng', function () {
        $pack = StickerPack::factory()->create();
        YonaStickers::ready($pack, ['label' => 'Xong', 'keywords' => ['ok'], 'position' => 0]);
        Sticker::factory()->for($pack, 'stickerPack')->create(['status' => Sticker::STATUS_FAILED, 'failure_code' => 'render_failed', 'position' => 1]);

        StickerLibraryServer::tool(GetStickerPack::class, ['pack_id' => $pack->id])
            ->assertOk()
            ->assertStructuredContent(fn (AssertableJson $json) => $json
                ->where('stickers.0.status', Sticker::STATUS_READY)
                ->where('stickers.0.keywords', ['ok'])
                ->where('stickers.1.status', Sticker::STATUS_FAILED)
                ->where('stickers.1.failure_message', __('errors.sticker_uploads.render_failed'))
                ->etc());
    });

    it('update_sticker sửa từ khoá, giữ nhãn khi không gửi', function () {
        $sticker = YonaStickers::ready(StickerPack::factory()->create(), ['label' => 'Giữ']);

        StickerLibraryServer::tool(UpdateSticker::class, ['pack_id' => $sticker->sticker_pack_id, 'sticker_id' => $sticker->id, 'keywords' => ['Cảm ơn']])
            ->assertOk()
            ->assertStructuredContent(fn (AssertableJson $json) => $json->where('label', 'Giữ')->where('keywords', ['cảm ơn'])->etc());
    });

    it('update_sticker từ chối sticker kho riêng của tenant', function () {
        $sticker = YonaStickers::ready(YonaStickers::tenantPack(Account::factory()->create()), ['label' => 'Giữ']);

        StickerLibraryServer::tool(UpdateSticker::class, ['pack_id' => $sticker->sticker_pack_id, 'sticker_id' => $sticker->id, 'label' => 'Lén'])
            ->assertHasErrors([__('errors.sticker_library.not_found')]);
        expect($sticker->fresh()->label)->toBe('Giữ');
    });

    it('set_sticker_pack_published bật rồi tắt xuất bản', function () {
        $pack = StickerPack::factory()->unpublished()->create();

        StickerLibraryServer::tool(SetStickerPackPublished::class, ['pack_id' => $pack->id, 'published' => true])
            ->assertStructuredContent(fn (AssertableJson $json) => $json->where('published', true)->etc());
        expect($pack->fresh()->published_at)->not->toBeNull();

        StickerLibraryServer::tool(SetStickerPackPublished::class, ['pack_id' => $pack->id, 'published' => false])->assertOk();
        expect($pack->fresh()->published_at)->toBeNull();
    });

    it('delete_sticker xoá sticker và trả bộ còn lại', function () {
        $pack = StickerPack::factory()->create();
        $doomed = YonaStickers::ready($pack, ['position' => 0]);
        $kept = YonaStickers::ready($pack, ['position' => 1]);

        StickerLibraryServer::tool(DeleteSticker::class, ['pack_id' => $pack->id, 'sticker_id' => $doomed->id])
            ->assertOk()
            ->assertStructuredContent(fn (AssertableJson $json) => $json->has('stickers', 1)->where('stickers.0.id', $kept->id)->etc());

        expect(Sticker::query()->find($doomed->id))->toBeNull();
    });

    it('resource hướng dẫn Lottie đọc được và server gửi kèm ngay lúc initialize', function () {
        StickerLibraryServer::resource(LottieAuthoringGuide::class)
            ->assertOk()
            ->assertSee('tối đa '.LottieDocumentValidator::MAX_CANVAS_SIZE.' px');
    });
});

describe('HTTP /mcp/stickers', function () {
    beforeEach(function () {
        $this->token = PlatformApp::factory()->create()->accessToken->token;
    });

    it('token sai hay thiếu thì 401', function () {
        mcpCall('sai-token', 'tools/list')->assertUnauthorized();
        $this->postJson(StickerLibraryServer::PATH, ['jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/list'])->assertUnauthorized();
    });

    it('initialize trả instructions có hướng dẫn Lottie, tools/list đủ tool, gọi upload_sticker qua HTTP', function () {
        $initialize = mcpCall($this->token, 'initialize', [
            'protocolVersion' => '2025-06-18',
            'capabilities' => (object) [],
            'clientInfo' => ['name' => 'pest', 'version' => '1.0'],
        ])->assertOk();
        expect($initialize->json('result.serverInfo.name'))->toBe('Yona Stickers')
            ->and($initialize->json('result.instructions'))->toContain(LottieAuthoringGuide::MINIMAL_EXAMPLE);

        $toolNames = array_column(mcpCall($this->token, 'tools/list', id: 2)->assertOk()->json('result.tools'), 'name');
        expect($toolNames)->toEqualCanonicalizing([
            'list_sticker_packs', 'get_sticker_pack', 'create_sticker_pack', 'rename_sticker_pack',
            'upload_sticker', 'update_sticker', 'set_sticker_pack_published', 'delete_sticker',
        ]);

        $pack = StickerPack::factory()->create();
        $upload = mcpCall($this->token, 'tools/call', [
            'name' => 'upload_sticker',
            'arguments' => ['pack_id' => $pack->id, 'lottie_json' => mcpStickerFixture('ball-with-poster-marker.json'), 'keywords' => ['bóng']],
        ], 3)->assertOk();

        expect($upload->json('result.isError'))->toBeFalse()
            ->and($upload->json('result.structuredContent.keywords'))->toBe(['bóng'])
            ->and($pack->stickers()->sole()->status)->toBe(Sticker::STATUS_READY);
    });
});

<?php

use App\Mcp\Prompts\DesignStickerPackPrompt;
use App\Mcp\Resources\LottieAuthoringGuide;
use App\Mcp\Servers\StickerLibraryServer;
use App\Mcp\Tools\Stickers\PreviewSticker;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Models\User;
use App\Services\Stickers\LottieDocumentValidator;
use App\Services\Stickers\StickerLibraryManager;
use App\Services\Stickers\StickerPackSkill;
use App\Services\Stickers\StickerRenderer;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\Support\FakeStickerRenderer;
use Tests\Support\YonaStickers;

// Xem thử sticker cho AI và skill tạo bộ sticker phát qua prompt MCP: xem thử đi
// qua đúng cổng kiểm + trình dựng ảnh của luồng upload nhưng không lưu gì.

const PREVIEW_PLATFORM_THROTTLE_KEY = 'mcp-sticker-previews:platform-library';

const PREVIEW_WORKSPACE_GLOB = 'yona-sticker-preview-*';

function previewFixture(string $name): string
{
    return file_get_contents(base_path("tests/Fixtures/stickers/{$name}"));
}

function previewWorkspaces(): array
{
    return glob(sys_get_temp_dir().'/'.PREVIEW_WORKSPACE_GLOB) ?: [];
}

/** @param array<string, mixed> $params */
function previewMcpCall(string $token, string $method, array $params = []): TestResponse
{
    return test()->postJson(StickerLibraryServer::PATH, ['jsonrpc' => '2.0', 'id' => 1, 'method' => $method, 'params' => $params], [
        'Authorization' => "Bearer {$token}",
        'Accept' => 'application/json, text/event-stream',
    ]);
}

beforeEach(function () {
    Storage::fake(Sticker::DISK);
    FakeStickerRenderer::install();
    RateLimiter::clear(PREVIEW_PLATFORM_THROTTLE_KEY);
    config(['yona.system_admin_emails' => '']);
});

describe('preview_sticker', function () {
    beforeEach(function () {
        YonaStickers::actAsLibrary(null);
    });

    it('Lottie hợp lệ trả ảnh poster webp kèm số đo, không lưu gì và dọn thư mục tạm', function () {
        $workspacesBefore = previewWorkspaces();

        StickerLibraryServer::tool(PreviewSticker::class, ['lottie_json' => LottieAuthoringGuide::MINIMAL_EXAMPLE])
            ->assertOk()
            ->assertSee([base64_encode('poster-bytes'), '512×512 px', '60 khung hình', '2 giây']);

        expect(Sticker::query()->count())->toBe(0)
            ->and(StickerPack::query()->count())->toBe(0)
            ->and(Storage::disk(Sticker::DISK)->allFiles())->toBe([])
            ->and(previewWorkspaces())->toBe($workspacesBefore);
    });

    it('nhận tgs_base64 như upload_sticker', function () {
        StickerLibraryServer::tool(PreviewSticker::class, ['tgs_base64' => base64_encode(previewFixture('spinner-with-precomp.tgs'))])
            ->assertOk()
            ->assertSee(base64_encode('poster-bytes'));
    });

    it('trả đúng câu lỗi của cổng kiểm', function (array $arguments, Closure $message) {
        StickerLibraryServer::tool(PreviewSticker::class, $arguments)->assertHasErrors([$message()]);

        expect(Sticker::query()->count())->toBe(0);
    })->with([
        'lớp chữ' => [fn () => ['lottie_json' => previewFixture('text-layer.json')], fn () => __('errors.sticker_uploads.text_not_allowed')],
        'JSON hỏng' => [fn () => ['lottie_json' => previewFixture('broken.json')], fn () => __('errors.sticker_uploads.invalid_json')],
        'khung quá lớn' => [
            fn () => ['lottie_json' => str_replace('"w":512', '"w":'.(LottieDocumentValidator::MAX_CANVAS_SIZE + 1), LottieAuthoringGuide::MINIMAL_EXAMPLE)],
            fn () => __('errors.sticker_uploads.canvas_too_large', LottieDocumentValidator::limitPlaceholders()),
        ],
        'base64 hỏng' => [fn () => ['tgs_base64' => '***không-phải-base64***'], fn () => __('errors.sticker_library.invalid_base64')],
    ]);

    it('trình dựng ảnh hỏng thì trả câu lỗi dựng ảnh và vẫn dọn thư mục tạm', function () {
        $workspacesBefore = previewWorkspaces();
        app()->instance('tests.fake-sticker-renderer', new class implements StickerRenderer
        {
            public function render(string $animationPath, string $outputDirectory): array
            {
                return ['failure' => StickerRenderer::RENDER_TIMEOUT];
            }
        });

        StickerLibraryServer::tool(PreviewSticker::class, ['lottie_json' => LottieAuthoringGuide::MINIMAL_EXAMPLE])
            ->assertHasErrors([__('errors.sticker_uploads.render_timeout')]);

        expect(previewWorkspaces())->toBe($workspacesBefore);
    });

    it('vượt nhịp xem thử thì báo chờ, không dựng ảnh', function () {
        foreach (range(1, PreviewSticker::PREVIEWS_PER_MINUTE) as $attempt) {
            RateLimiter::hit(PREVIEW_PLATFORM_THROTTLE_KEY, 60);
        }

        StickerLibraryServer::tool(PreviewSticker::class, ['lottie_json' => LottieAuthoringGuide::MINIMAL_EXAMPLE])
            ->assertHasErrors([__('errors.sticker_library.preview_throttled')]);
    });
});

it('preview_sticker khi chưa có kho được cấp thì từ chối', function () {
    StickerLibraryServer::tool(PreviewSticker::class, ['lottie_json' => LottieAuthoringGuide::MINIMAL_EXAMPLE])
        ->assertHasErrors([__('errors.sticker_library.forbidden')]);
});

describe('prompt design_sticker_pack', function () {
    it('trả nội dung SKILL.md bỏ frontmatter kèm yêu cầu của người dùng', function () {
        StickerLibraryServer::prompt(DesignStickerPackPrompt::class, ['idea' => 'mèo cam cho shop trà sữa', 'sticker_count' => '6'])
            ->assertOk()
            ->assertSee(['# Tạo bộ sticker Yona', 'Chuẩn bị <Tên>', 'Ý tưởng nhân vật hoặc thương hiệu shop: mèo cam cho shop trà sữa', 'Số sticker: 6', 'Tên bộ: (bỏ trống'])
            ->assertDontSee('name: yona-sticker-pack');
    });

    it('số sticker ngoài khoảng cho phép thì báo lỗi', function () {
        StickerLibraryServer::prompt(DesignStickerPackPrompt::class, ['sticker_count' => (string) (StickerLibraryManager::MAX_STICKERS_PER_PACK + 1)])
            ->assertHasErrors();
    });

    it('skill chỉ nhắc tool có thật và không chép cứng giới hạn của hướng dẫn Lottie', function () {
        $skill = app(StickerPackSkill::class)->document();
        preg_match_all('/`([a-z]+(?:_[a-z]+)+)`/', $skill, $matches);
        $mentionedTools = array_values(array_unique(array_filter($matches[1], fn (string $name) => str_contains($name, 'sticker'))));
        $registeredTools = array_map(
            fn (string $tool) => app($tool)->name(),
            (new ReflectionProperty(StickerLibraryServer::class, 'tools'))->getDefaultValue(),
        );

        expect($skill)->toStartWith("---\nname: yona-sticker-pack\n")
            ->and($mentionedTools)->toContain('preview_sticker', 'upload_sticker', 'set_sticker_pack_published')
            ->and(array_diff($mentionedTools, $registeredTools))->toBe([])
            ->and($skill)->not->toContain((string) LottieDocumentValidator::MAX_CANVAS_SIZE)
            ->and($skill)->not->toContain((string) StickerLibraryManager::MAX_STICKERS_PER_PACK)
            ->and($skill)->not->toContain(' KB');

        config(['yona.stickers.outbound_image_size' => 72]);
        expect(LottieAuthoringGuide::markdown())->toContain('ảnh tĩnh vuông 72 px');
    });
});

describe('HTTP /mcp/stickers', function () {
    beforeEach(function () {
        $this->account = Account::factory()->create();
        $admin = User::factory()->create();
        AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $admin->id, 'role' => AccountUser::ROLE_ADMINISTRATOR]);
        YonaStickers::enableCustomStickers($this->account);
        $this->token = YonaStickers::issueToken($this->account, $admin);
    });

    it('preview_sticker bằng token kho riêng trả ảnh image/webp, không tạo sticker', function () {
        $response = previewMcpCall($this->token, 'tools/call', [
            'name' => 'preview_sticker',
            'arguments' => ['lottie_json' => LottieAuthoringGuide::MINIMAL_EXAMPLE],
        ])->assertOk();

        $image = collect($response->json('result.content'))->firstWhere('type', 'image');
        expect($response->json('result.isError'))->toBeFalse()
            ->and($image['mimeType'])->toBe('image/webp')
            ->and(base64_decode($image['data']))->toBe('poster-bytes')
            ->and(Sticker::query()->count())->toBe(0);
    });

    it('prompts/list có design_sticker_pack và prompts/get trả skill', function () {
        $prompts = previewMcpCall($this->token, 'prompts/list')->assertOk()->json('result.prompts');
        expect(array_column($prompts, 'name'))->toBe(['design_sticker_pack']);

        $messages = previewMcpCall($this->token, 'prompts/get', ['name' => 'design_sticker_pack', 'arguments' => ['pack_name' => 'Mèo Mít']])
            ->assertOk()
            ->json('result.messages');

        expect($messages[0]['content']['text'])->toContain('# Tạo bộ sticker Yona')->toContain('Tên bộ: Mèo Mít');
    });
});

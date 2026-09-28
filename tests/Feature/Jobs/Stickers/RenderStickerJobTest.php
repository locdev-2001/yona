<?php

use App\Jobs\Stickers\RenderStickerJob;
use App\Models\Attachment;
use App\Models\Message;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Services\Stickers\StickerFileLayout;
use App\Services\Stickers\StickerRenderer;
use App\Services\Stickers\StickerUploadService;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakeStickerRenderer;
use Tests\Support\YonaStickers;

beforeEach(function () {
    $this->disk = Storage::fake(Sticker::DISK);
    $this->contentHash = hash('sha256', 'original + edit');
    $this->renderedPaths = StickerFileLayout::renderedPaths($this->contentHash);
    $this->originalPath = StickerFileLayout::originalPath($this->contentHash, 'png');
    $this->originalBytes = YonaStickers::png(128);
    $this->disk->put($this->originalPath, $this->originalBytes);
    $this->edit = ['crop' => ['x' => 0.1, 'y' => 0, 'w' => 0.8, 'h' => 0.8], 'tolerance' => 12];
    $this->sticker = Sticker::factory()->processing()->create([
        'content_hash' => $this->contentHash,
        'original_path' => $this->originalPath,
        'edit_params' => $this->edit,
    ]);
    $this->renderer = FakeStickerRenderer::install();

    $this->runJob = fn (?Sticker $sticker = null, bool $refreshing = false) => (new RenderStickerJob($sticker ?? $this->sticker, $refreshing))->handle();
    $this->failWritesTo = function (string $failingFile): void {
        $realDisk = $this->disk;
        $failingDisk = Mockery::mock($realDisk)->makePartial();
        $failingDisk->shouldReceive('put')->andReturnUsing(
            fn (string $path, mixed $contents) => str_ends_with($path, $failingFile) ? false : $realDisk->put($path, $contents),
        );
        Storage::set(Sticker::DISK, $failingDisk);
    };
});

it('dựng từ ảnh gốc + thông số chỉnh đã lưu, ghi tệp mang cạnh ảnh theo hash rồi chuyển ready', function () {
    config(['yona.stickers.image_size' => 72]);
    $this->renderedPaths = StickerFileLayout::renderedPaths($this->contentHash);
    $this->renderer->scenario = fn (string $image, string $output, array $edit, int $size) => FakeStickerRenderer::writeOutputs($output, $size, 'webp-bytes', 'png-bytes', frames: 4, gifBytes: 'gif-bytes');

    ($this->runJob)();

    $sticker = $this->sticker->fresh();
    $directory = substr($this->contentHash, 0, 2).'/'.$this->contentHash;
    expect($this->renderedPaths)->toBe(['image_path' => "{$directory}/sticker-72.webp", 'static_path' => "{$directory}/static-128.png", 'gif_path' => "{$directory}/sticker-128.gif"])
        ->and($sticker->only(['status', 'failure_code', 'image_path', 'static_path', 'gif_path', 'original_path', 'width', 'height', 'frame_count', 'duration_ms', 'byte_size']))->toBe([
            'status' => Sticker::STATUS_READY,
            'failure_code' => null,
            ...$this->renderedPaths,
            'original_path' => $this->originalPath,
            'width' => 72,
            'height' => 72,
            'frame_count' => 4,
            'duration_ms' => 400,
            'byte_size' => strlen('webp-bytes'),
        ])
        ->and($this->disk->get($this->renderedPaths['image_path']))->toBe('webp-bytes')
        ->and($this->disk->get($this->renderedPaths['static_path']))->toBe('png-bytes')
        ->and($this->disk->get($this->renderedPaths['gif_path']))->toBe('gif-bytes')
        ->and($this->disk->get($this->originalPath))->toBe($this->originalBytes)
        ->and($this->renderer->calls)->toHaveCount(1)
        ->and($this->renderer->calls[0])->toMatchArray(['image_bytes' => $this->originalBytes, 'edit' => $this->edit, 'size' => 72])
        ->and(basename($this->renderer->calls[0]['image_path']))->toBe('original.png');
});

it('không có thông số chỉnh thì giao trình dựng edit rỗng để dùng mặc định', function () {
    $this->sticker->update(['edit_params' => null]);

    ($this->runJob)();

    expect($this->renderer->calls[0]['edit'])->toBe([])
        ->and($this->sticker->fresh()->status)->toBe(Sticker::STATUS_READY);
});

it('dọn thư mục làm việc tạm dù dựng được hay hỏng', function (?string $failure) {
    if ($failure !== null) {
        $this->renderer->scenario = fn () => ['failure' => $failure];
    }

    ($this->runJob)();

    expect(File::exists(dirname($this->renderer->calls[0]['image_path'])))->toBeFalse();
})->with([
    'dựng được' => [null],
    'hỏng' => [StickerRenderer::RENDER_FAILED],
]);

it('trình dựng báo lỗi thì sticker failed kèm mã, không để lại tệp nào kể cả ảnh gốc', function (string $failure) {
    $this->renderer->scenario = fn () => ['failure' => $failure];

    ($this->runJob)();

    expect($this->sticker->fresh()->only(['status', 'failure_code', 'image_path', 'static_path', 'gif_path', 'original_path']))->toBe([
        'status' => Sticker::STATUS_FAILED,
        'failure_code' => $failure,
        'image_path' => null,
        'static_path' => null,
        'gif_path' => null,
        'original_path' => null,
    ])
        ->and($this->disk->allFiles())->toBe([]);
})->with([
    StickerRenderer::RENDER_FAILED,
    StickerRenderer::RENDER_TIMEOUT,
    StickerRenderer::RENDERER_UNAVAILABLE,
    StickerRenderer::IMAGE_UNREADABLE,
    StickerRenderer::IMAGE_TOO_LARGE,
    StickerRenderer::TOO_MANY_FRAMES,
    StickerRenderer::IMAGE_EMPTY,
]);

it('ảnh gốc không còn trên disk thì sticker failed, không gọi trình dựng', function () {
    $this->disk->delete($this->originalPath);

    ($this->runJob)();

    expect($this->renderer->calls)->toBe([])
        ->and($this->sticker->fresh()->only(['status', 'failure_code']))
        ->toBe(['status' => Sticker::STATUS_FAILED, 'failure_code' => RenderStickerJob::ORIGINAL_MISSING]);
});

it('lỗi bất ngờ của trình dựng tính là trình dựng chưa sẵn sàng', function () {
    $this->renderer->scenario = fn () => throw new RuntimeException('sharp crashed');

    ($this->runJob)();

    expect($this->sticker->fresh()->only(['status', 'failure_code']))
        ->toBe(['status' => Sticker::STATUS_FAILED, 'failure_code' => StickerRenderer::RENDERER_UNAVAILABLE])
        ->and($this->disk->allFiles())->toBe([]);
});

it('ghi disk hỏng thì sticker failed và dọn tệp đã ghi', function (string $failingPathKey) {
    ($this->failWritesTo)($this->renderedPaths[$failingPathKey]);

    ($this->runJob)();

    expect($this->sticker->fresh()->only(['status', 'failure_code']))
        ->toBe(['status' => Sticker::STATUS_FAILED, 'failure_code' => RenderStickerJob::STORAGE_WRITE_FAILED])
        ->and($this->disk->allFiles())->toBe([]);
})->with(['image_path', 'static_path', 'gif_path']);

it('không đụng tệp dùng chung khi sticker khác cùng nội dung còn dùng', function () {
    Sticker::factory()->create(['content_hash' => $this->contentHash, ...$this->renderedPaths, 'original_path' => $this->originalPath]);
    foreach ($this->renderedPaths as $path) {
        $this->disk->put($path, 'already published');
    }
    ($this->failWritesTo)($this->renderedPaths['static_path']);

    ($this->runJob)();

    $failed = $this->sticker->fresh();
    expect($failed->status)->toBe(Sticker::STATUS_FAILED)
        ->and($failed->original_path)->toBe($this->originalPath)
        ->and($this->disk->get($this->renderedPaths['static_path']))->toBe('already published');
    foreach ([...$this->renderedPaths, $this->originalPath] as $path) {
        $this->disk->assertExists($path);
    }
});

it('không đụng tệp dùng chung khi tin đã gửi còn mượn ảnh tĩnh', function () {
    foreach ($this->renderedPaths as $path) {
        $this->disk->put($path, 'already published');
    }
    $message = Message::factory()->create();
    $message->attachments()->create([
        'account_id' => $message->account_id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'disk' => Sticker::DISK,
        'path' => $this->renderedPaths['static_path'],
    ]);
    $this->renderer->scenario = fn () => ['failure' => StickerRenderer::RENDER_FAILED];

    ($this->runJob)();

    expect($this->sticker->fresh()->status)->toBe(Sticker::STATUS_FAILED);
    foreach ($this->renderedPaths as $path) {
        $this->disk->assertExists($path);
    }
});

it('bỏ qua sticker không còn processing', function () {
    $readySticker = Sticker::factory()->create();

    ($this->runJob)($readySticker);

    expect($this->renderer->calls)->toBe([])
        ->and($readySticker->fresh()->status)->toBe(Sticker::STATUS_READY);
});

it('worker bỏ job giữa chừng thì sticker còn processing thành hết giờ', function () {
    (new RenderStickerJob($this->sticker))->failed(new RuntimeException('Job has timed out.'));

    expect($this->sticker->fresh()->only(['status', 'failure_code']))
        ->toBe(['status' => Sticker::STATUS_FAILED, 'failure_code' => StickerRenderer::RENDER_TIMEOUT]);
});

it('chạy một lần trên hàng đợi riêng với hạn dài hơn mọi lượt dựng', function () {
    $job = new RenderStickerJob($this->sticker);

    expect($job->queue)->toBe('stickers')
        ->and($job->tries)->toBe(1)
        ->and($job->timeout)->toBeGreaterThan(60);
});

// Dựng nặng CPU/bộ nhớ: một supervisor riêng chạy đúng một process, không nằm
// trong các tier của tin nhắn nên tải lên dồn dập không làm chậm việc gửi tin.
it('do một supervisor riêng một process phục vụ, ngoài các tier tin nhắn', function () {
    $supervisor = config('horizon.defaults.supervisor-stickers');
    $job = new RenderStickerJob($this->sticker);

    expect($supervisor['queue'])->toBe([$job->queue])
        ->and($supervisor['maxProcesses'])->toBe(1)
        ->and($supervisor['timeout'])->toBeGreaterThan($job->timeout)
        ->and($supervisor['timeout'])->toBeLessThan(config('queue.connections.redis.retry_after'))
        ->and(config('horizon.defaults.supervisor-1.queue'))->not->toContain('stickers');
});

it('dựng lại sticker đã ready theo cỡ mới: tệp mang cạnh mới (URL mới, không đè cache cũ), vẫn ready, tệp cũ còn cho tin đã gửi', function () {
    ($this->runJob)();
    $oldPaths = $this->renderedPaths;
    config(['yona.stickers.image_size' => 96, 'yona.stickers.outbound_image_size' => 160]);
    $this->renderedPaths = StickerFileLayout::renderedPaths($this->contentHash);
    $this->renderer->scenario = fn (string $image, string $output, array $edit, int $size) => FakeStickerRenderer::writeOutputs($output, $size, 'webp-v2', 'png-v2');

    ($this->runJob)($this->sticker->fresh(), true);

    $sticker = $this->sticker->fresh();
    expect($sticker->only(['status', 'image_path', 'static_path', 'gif_path', 'width', 'height']))
        ->toBe(['status' => Sticker::STATUS_READY, ...$this->renderedPaths, 'width' => 96, 'height' => 96])
        ->and($this->renderer->calls[1]['size'])->toBe(96)
        ->and($this->renderer->calls[1]['static_size'])->toBe(160)
        ->and($this->renderedPaths['static_path'])->toEndWith('/static-160.png')
        ->and($this->renderedPaths['gif_path'])->toEndWith('/sticker-160.gif')
        ->and($this->disk->exists($this->renderedPaths['gif_path']))->toBeTrue()
        ->and($this->renderedPaths)->not->toBe($oldPaths)
        ->and($this->disk->exists($oldPaths['static_path']))->toBeTrue()
        ->and($this->renderer->calls[1]['edit'])->toEqual($this->edit)
        ->and($this->disk->get($this->renderedPaths['static_path']))->toBe('png-v2')
        ->and($this->disk->get($this->renderedPaths['image_path']))->toBe('webp-v2');
});

it('dựng lại hỏng thì sticker giữ ready và tệp cũ', function () {
    ($this->runJob)();
    $this->renderer->scenario = fn () => ['failure' => StickerRenderer::RENDER_FAILED];

    ($this->runJob)($this->sticker->fresh(), true);

    $sticker = $this->sticker->fresh();
    expect($sticker->only(['status', 'failure_code']))->toBe(['status' => Sticker::STATUS_READY, 'failure_code' => null])
        ->and($this->disk->get($this->renderedPaths['static_path']))->toBe('static-png')
        ->and($this->disk->get($this->originalPath))->toBe($this->originalBytes);
});

it('lượt dựng lại không chạm sticker đang processing', function () {
    ($this->runJob)(null, true);

    expect($this->renderer->calls)->toBe([])
        ->and($this->sticker->fresh()->status)->toBe(Sticker::STATUS_PROCESSING);
});

describe('với trình dựng thật', function () {
    beforeEach(function () {
        config([
            'yona.stickers.renderer' => 'node',
            'yona.stickers.memory_limiter' => is_executable('/usr/bin/prlimit') ? 'prlimit' : 'none',
        ]);
        $this->pack = StickerPack::factory()->create();
    });

    it('biến ảnh PNG tải lên thành sticker ready: WebP cạnh image_size trong Yona, PNG cạnh outbound_image_size gửi kênh ngoài', function () {
        $sticker = app(StickerUploadService::class)->upload($this->pack, YonaStickers::imageUpload('dot.png', side: 400), 'Chấm')->fresh();
        $side = Sticker::imageSize();
        $outboundSide = Sticker::outboundImageSize();

        expect($sticker->only(['status', 'width', 'height', 'frame_count']))->toBe(['status' => Sticker::STATUS_READY, 'width' => $side, 'height' => $side, 'frame_count' => 1])
            ->and($sticker->only(['image_path', 'static_path', 'gif_path']))->toBe(StickerFileLayout::renderedPaths($sticker->content_hash))
            ->and(getimagesizefromstring($this->disk->get($sticker->gif_path)))->toMatchArray([0 => $outboundSide, 1 => $outboundSide, 'mime' => 'image/gif'])
            ->and(getimagesizefromstring($this->disk->get($sticker->image_path)))->toMatchArray([0 => $side, 1 => $side, 'mime' => 'image/webp'])
            ->and(getimagesizefromstring($this->disk->get($sticker->static_path)))->toMatchArray([0 => $outboundSide, 1 => $outboundSide, 'mime' => 'image/png'])
            ->and($sticker->byte_size)->toBe(strlen($this->disk->get($sticker->image_path)));
    });

    it('biến GIF động thành WebP động cùng số khung, PNG tĩnh cho kênh ngoài', function () {
        $sticker = app(StickerUploadService::class)->upload($this->pack, YonaStickers::animatedUpload())->fresh();
        $webp = $this->disk->get($sticker->image_path);

        expect($sticker->only(['status', 'frame_count', 'duration_ms']))->toBe(['status' => Sticker::STATUS_READY, 'frame_count' => 4, 'duration_ms' => 480])
            ->and(str_contains($webp, 'ANIM') && substr_count($webp, 'ANMF') === 4)->toBeTrue()
            ->and(getimagesizefromstring($this->disk->get($sticker->static_path)))->toMatchArray([0 => Sticker::outboundImageSize(), 1 => Sticker::outboundImageSize(), 'mime' => 'image/png']);
    });

    it('xoá nền hết sạch thì sticker failed với lời nhắc chỉnh độ nhạy', function () {
        $sticker = app(StickerUploadService::class)
            ->upload($this->pack, YonaStickers::imageUpload(), editJson: '{"removeBackground":true,"tolerance":100}')
            ->fresh();

        expect($sticker->only(['status', 'failure_code']))->toBe(['status' => Sticker::STATUS_FAILED, 'failure_code' => StickerRenderer::IMAGE_EMPTY]);
    });
})->group('renderer')->skip(
    fn () => ! is_dir(base_path('services/sticker-renderer/node_modules/sharp')),
    'Chưa cài services/sticker-renderer (corepack pnpm --dir services/sticker-renderer install).',
);

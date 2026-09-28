<?php

use App\Jobs\Stickers\RenderStickerJob;
use App\Models\Attachment;
use App\Models\Message;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Services\Stickers\StickerRenderer;
use App\Services\Stickers\StickerUploadService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->disk = Storage::fake(Sticker::DISK);
    $this->animationJson = '{"v":"5.7.0","fr":30,"ip":0,"op":60,"w":512,"h":512,"layers":[]}';
    $this->contentHash = hash('sha256', $this->animationJson);
    $this->storagePaths = RenderStickerJob::storagePaths($this->contentHash);
    $this->sticker = Sticker::factory()->processing()->create(['content_hash' => $this->contentHash]);

    // Renderer giả: ghi hai ảnh vào thư mục được giao, hoặc làm theo kịch bản của từng test.
    $this->renderer = new class implements StickerRenderer
    {
        public ?Closure $scenario = null;

        /** @var list<array{animation_json: string, animation_path: string, output_directory: string}> */
        public array $calls = [];

        public function render(string $animationPath, string $outputDirectory): array
        {
            $this->calls[] = ['animation_json' => file_get_contents($animationPath), 'animation_path' => $animationPath, 'output_directory' => $outputDirectory];
            if ($this->scenario !== null) {
                return ($this->scenario)($outputDirectory);
            }

            File::ensureDirectoryExists($outputDirectory);
            File::put("{$outputDirectory}/poster.webp", 'poster-bytes');
            File::put("{$outputDirectory}/static.png", 'static-bytes');

            return ['poster_path' => "{$outputDirectory}/poster.webp", 'static_path' => "{$outputDirectory}/static.png", 'poster_frame' => 30];
        }
    };
    app()->instance('tests.sticker-renderer', $this->renderer);
    config(['yona.stickers.renderer' => 'fake', 'yona.stickers.renderers.fake.class' => 'tests.sticker-renderer']);

    $this->runJob = fn (?Sticker $sticker = null) => (new RenderStickerJob($sticker ?? $this->sticker, $this->animationJson))->handle();
    $this->failWritesTo = function (string $failingFile): void {
        $realDisk = $this->disk;
        $failingDisk = Mockery::mock($realDisk)->makePartial();
        $failingDisk->shouldReceive('put')->andReturnUsing(
            fn (string $path, mixed $contents) => str_ends_with($path, $failingFile) ? false : $realDisk->put($path, $contents),
        );
        Storage::set(Sticker::DISK, $failingDisk);
    };
});

it('stores the animation, poster and still under the content hash and marks the sticker ready', function () {
    ($this->runJob)();

    $sticker = $this->sticker->fresh();
    $directory = substr($this->contentHash, 0, 2).'/'.$this->contentHash;
    expect($this->storagePaths)->toBe([
        'animation_path' => "{$directory}/anim.json",
        'poster_path' => "{$directory}/poster.webp",
        'static_path' => "{$directory}/static.png",
    ])
        ->and($sticker->status)->toBe(Sticker::STATUS_READY)
        ->and($sticker->failure_code)->toBeNull()
        ->and($sticker->only(['animation_path', 'poster_path', 'static_path']))->toBe($this->storagePaths)
        ->and($this->disk->get($this->storagePaths['animation_path']))->toBe($this->animationJson)
        ->and($this->disk->get($this->storagePaths['poster_path']))->toBe('poster-bytes')
        ->and($this->disk->get($this->storagePaths['static_path']))->toBe('static-bytes')
        ->and($this->renderer->calls[0]['animation_json'])->toBe($this->animationJson);
});

it('removes its scratch workspace whether the render succeeds or fails', function (?string $failure) {
    if ($failure !== null) {
        $this->renderer->scenario = fn () => ['failure' => $failure];
    }

    ($this->runJob)();

    expect(File::exists(dirname($this->renderer->calls[0]['animation_path'])))->toBeFalse();
})->with([
    'success' => [null],
    'failure' => [StickerRenderer::RENDER_FAILED],
]);

it('marks the sticker failed with the renderer failure code and stores nothing', function (string $failure) {
    $this->renderer->scenario = fn () => ['failure' => $failure];

    ($this->runJob)();

    $sticker = $this->sticker->fresh();
    expect($sticker->status)->toBe(Sticker::STATUS_FAILED)
        ->and($sticker->failure_code)->toBe($failure)
        ->and($sticker->only(['animation_path', 'poster_path', 'static_path']))->toBe(['animation_path' => null, 'poster_path' => null, 'static_path' => null])
        ->and($this->disk->allFiles())->toBe([]);
})->with([
    StickerRenderer::RENDER_FAILED,
    StickerRenderer::RENDER_TIMEOUT,
    StickerRenderer::RENDERER_UNAVAILABLE,
]);

it('treats an unexpected renderer exception as the renderer being unavailable', function () {
    $this->renderer->scenario = fn () => throw new RuntimeException('sharp crashed');

    ($this->runJob)();

    expect($this->sticker->fresh()->only(['status', 'failure_code']))
        ->toBe(['status' => Sticker::STATUS_FAILED, 'failure_code' => StickerRenderer::RENDERER_UNAVAILABLE])
        ->and($this->disk->allFiles())->toBe([]);
});

it('fails the sticker and removes the files already written when a disk write fails', function (string $failingFile) {
    ($this->failWritesTo)($failingFile);

    ($this->runJob)();

    expect($this->sticker->fresh()->only(['status', 'failure_code']))
        ->toBe(['status' => Sticker::STATUS_FAILED, 'failure_code' => RenderStickerJob::STORAGE_WRITE_FAILED])
        ->and($this->disk->allFiles())->toBe([]);
})->with(['anim.json', 'poster.webp', 'static.png']);

it('leaves shared files alone when another sticker with the same content still uses them', function () {
    Sticker::factory()->create(['content_hash' => $this->contentHash, ...$this->storagePaths]);
    foreach ($this->storagePaths as $path) {
        $this->disk->put($path, 'already published');
    }
    ($this->failWritesTo)('static.png');

    ($this->runJob)();

    expect($this->sticker->fresh()->status)->toBe(Sticker::STATUS_FAILED)
        ->and($this->disk->get($this->storagePaths['static_path']))->toBe('already published');
    foreach ($this->storagePaths as $path) {
        $this->disk->assertExists($path);
    }
});

it('leaves shared files alone while a sent message still borrows them', function () {
    foreach ($this->storagePaths as $path) {
        $this->disk->put($path, 'already published');
    }
    $message = Message::factory()->create();
    $message->attachments()->create([
        'account_id' => $message->account_id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'disk' => Sticker::DISK,
        'path' => $this->storagePaths['static_path'],
    ]);
    $this->renderer->scenario = fn () => ['failure' => StickerRenderer::RENDER_FAILED];

    ($this->runJob)();

    expect($this->sticker->fresh()->status)->toBe(Sticker::STATUS_FAILED);
    foreach ($this->storagePaths as $path) {
        $this->disk->assertExists($path);
    }
});

it('does nothing for a sticker that is no longer processing', function () {
    $readySticker = Sticker::factory()->create();

    ($this->runJob)($readySticker);

    expect($this->renderer->calls)->toBe([])
        ->and($readySticker->fresh()->status)->toBe(Sticker::STATUS_READY);
});

it('marks a sticker still processing as timed out when the worker gives up on the job', function () {
    (new RenderStickerJob($this->sticker, $this->animationJson))->failed(new RuntimeException('Job has timed out.'));

    expect($this->sticker->fresh()->only(['status', 'failure_code']))
        ->toBe(['status' => Sticker::STATUS_FAILED, 'failure_code' => StickerRenderer::RENDER_TIMEOUT]);
});

it('runs one attempt on its own queue with a deadline longer than any render', function () {
    $job = new RenderStickerJob($this->sticker, $this->animationJson);

    expect($job->queue)->toBe('stickers')
        ->and($job->tries)->toBe(1)
        ->and($job->timeout)->toBeGreaterThan(60);
});

// Render nặng CPU/bộ nhớ: một supervisor riêng chạy đúng một process, không nằm
// trong các tier của tin nhắn nên upload dồn dập không làm chậm việc gửi tin.
it('is served by a dedicated single-process supervisor outside the message tiers', function () {
    $supervisor = config('horizon.defaults.supervisor-stickers');
    $job = new RenderStickerJob($this->sticker, $this->animationJson);

    expect($supervisor['queue'])->toBe([$job->queue])
        ->and($supervisor['maxProcesses'])->toBe(1)
        ->and($supervisor['timeout'])->toBeGreaterThan($job->timeout)
        ->and($supervisor['timeout'])->toBeLessThan(config('queue.connections.redis.retry_after'))
        ->and(config('horizon.defaults.supervisor-1.queue'))->not->toContain('stickers');
});

it('turns an uploaded TGS into a ready sticker with real images', function () {
    config([
        'yona.stickers.renderer' => 'node',
        'yona.stickers.memory_limiter' => is_executable('/usr/bin/prlimit') ? 'prlimit' : 'none',
    ]);
    $pack = StickerPack::factory()->create();
    $upload = UploadedFile::fake()->createWithContent('ball.tgs', file_get_contents(base_path('tests/Fixtures/stickers/ball-with-poster-marker.tgs')));

    $sticker = app(StickerUploadService::class)->upload($pack, $upload, 'Bóng nảy')->fresh();

    expect($sticker->status)->toBe(Sticker::STATUS_READY)
        ->and($sticker->only(['animation_path', 'poster_path', 'static_path']))->toBe(RenderStickerJob::storagePaths($sticker->content_hash))
        ->and(hash('sha256', $this->disk->get($sticker->animation_path)))->toBe($sticker->content_hash)
        ->and(getimagesizefromstring($this->disk->get($sticker->poster_path)))->toMatchArray([0 => 256, 1 => 256, 'mime' => 'image/webp'])
        ->and(getimagesizefromstring($this->disk->get($sticker->static_path)))->toMatchArray([0 => 512, 1 => 512, 'mime' => 'image/png']);
})->group('renderer')->skip(
    fn () => ! is_dir(base_path('services/sticker-renderer/node_modules/@thorvg/lottie-player')),
    'Chưa cài services/sticker-renderer (corepack pnpm --dir services/sticker-renderer install).',
);

<?php

use App\Jobs\Stickers\RenderStickerJob;
use App\Models\Sticker;
use App\Services\Stickers\StickerFileLayout;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakeStickerRenderer;
use Tests\Support\YonaStickers;

beforeEach(function () {
    $this->disk = Storage::fake(Sticker::DISK);
    Queue::fake();
});

it('xếp job dựng lại cho sticker ready có ảnh gốc, bỏ qua sticker chưa ready và sticker Lottie cũ', function () {
    $ready = YonaStickers::ready();
    Sticker::factory()->processing()->create();
    $legacy = YonaStickers::legacyLottie();

    $this->artisan('stickers:rerender')
        ->expectsOutputToContain('Đã xếp dựng lại 1 sticker')
        ->expectsOutputToContain('1 sticker không có ảnh gốc')
        ->assertSuccessful();

    Queue::assertPushed(RenderStickerJob::class, 1);
    Queue::assertPushed(RenderStickerJob::class, fn (RenderStickerJob $job) => $job->sticker->is($ready) && $job->refreshing);
    expect($legacy->fresh()->only(['image_path', 'static_path']))->toBe($legacy->only(['image_path', 'static_path']));
});

it('bỏ qua sticker mất ảnh gốc trên disk và báo số lượng', function () {
    $lost = YonaStickers::ready();
    $this->disk->delete($lost->original_path);

    $this->artisan('stickers:rerender')
        ->expectsOutputToContain('Đã xếp dựng lại 0 sticker')
        ->expectsOutputToContain('1 sticker thiếu ảnh gốc trên disk')
        ->assertSuccessful();

    Queue::assertNothingPushed();
});

it('--dry-run đếm đúng như lượt chạy thật mà không xếp job', function () {
    YonaStickers::ready();
    YonaStickers::ready();
    YonaStickers::legacyLottie();

    $this->artisan('stickers:rerender --dry-run')
        ->expectsOutputToContain('Sẽ dựng lại 2 sticker')
        ->expectsOutputToContain('1 sticker không có ảnh gốc')
        ->assertSuccessful();

    Queue::assertNothingPushed();
});

it('sticker dựng trước khi có bản GIF: dựng lại xong có gif_path và tệp GIF', function () {
    FakeStickerRenderer::install();
    $sticker = YonaStickers::ready();
    $sticker->update(['gif_path' => null]);

    $this->artisan('stickers:rerender')->assertSuccessful();
    Queue::pushed(RenderStickerJob::class)->each(fn (RenderStickerJob $job) => $job->handle());

    $sticker->refresh();
    expect($sticker->gif_path)->toBe(StickerFileLayout::renderedPaths($sticker->content_hash)['gif_path'])
        ->and($this->disk->exists($sticker->gif_path))->toBeTrue()
        ->and($sticker->status)->toBe(Sticker::STATUS_READY);
});

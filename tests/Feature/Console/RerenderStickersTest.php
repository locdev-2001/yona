<?php

use App\Jobs\Stickers\RenderStickerJob;
use App\Models\Sticker;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->disk = Storage::fake(Sticker::DISK);
    Queue::fake();
});

function readyStickerWithAnimation(string $animationJson): Sticker
{
    $paths = RenderStickerJob::storagePaths(hash('sha256', $animationJson));
    Storage::disk(Sticker::DISK)->put($paths['animation_path'], $animationJson);

    return Sticker::factory()->create([...$paths, 'status' => Sticker::STATUS_READY, 'content_hash' => hash('sha256', $animationJson)]);
}

it('xếp job dựng lại cho mọi sticker ready từ đúng Lottie đang lưu, bỏ qua sticker chưa ready', function () {
    $ready = readyStickerWithAnimation('{"v":"5.7.0","nm":"a"}');
    Sticker::factory()->processing()->create();

    $this->artisan('stickers:rerender')->assertSuccessful();

    Queue::assertPushed(RenderStickerJob::class, 1);
    Queue::assertPushed(RenderStickerJob::class, fn (RenderStickerJob $job) => $job->sticker->is($ready)
        && $job->refreshing
        && $job->animationJson === '{"v":"5.7.0","nm":"a"}');
});

it('--dry-run chỉ đếm, không xếp job', function () {
    readyStickerWithAnimation('{"v":"5.7.0","nm":"b"}');

    $this->artisan('stickers:rerender --dry-run')->expectsOutputToContain('Sẽ dựng lại 1 sticker')->assertSuccessful();

    Queue::assertNothingPushed();
});

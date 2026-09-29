<?php

use App\Models\Attachment;
use App\Models\Message;
use App\Models\Sticker;
use App\Services\Stickers\StickerFileLayout;
use App\Services\Stickers\StickerLibraryManager;
use Illuminate\Support\Facades\Storage;
use Tests\Support\YonaStickers;

beforeEach(function () {
    $this->disk = Storage::fake(Sticker::DISK);
});

function sentStickerMessage(Sticker $sticker, ?string $borrowedPath = null): Message
{
    $borrowedPath ??= (string) $sticker->static_path;
    $message = Message::factory()->create();
    $message->attachments()->create([
        'account_id' => $message->account_id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'disk' => Sticker::DISK,
        'path' => $borrowedPath,
        'filename' => basename($borrowedPath),
        'content_type' => 'image/png',
    ]);

    return $message;
}

function ageStickerFiles(string $contentHash, int $hours = 25): void
{
    $disk = Storage::disk(Sticker::DISK);
    foreach ($disk->allFiles(StickerFileLayout::directory($contentHash)) as $path) {
        touch($disk->path($path), now()->subHours($hours)->getTimestamp());
    }
}

it('xoá sticker đã gửi rồi xoá tin: lệnh dọn thư mục tệp bị bỏ lại', function () {
    $sticker = YonaStickers::ready();
    $directory = StickerFileLayout::directory($sticker->content_hash);
    $message = sentStickerMessage($sticker);

    app(StickerLibraryManager::class)->deleteSticker($sticker);
    expect($this->disk->exists($sticker->static_path))->toBeTrue();

    $message->attachments()->delete();
    $message->delete();
    ageStickerFiles($sticker->content_hash);

    $this->artisan('stickers:prune-orphan-files')
        ->expectsOutputToContain('Đã xoá 1 thư mục tệp sticker')
        ->assertSuccessful();

    expect($this->disk->allFiles($directory))->toBe([]);
});

it('giữ tệp còn sticker dùng hoặc còn tin mượn, và tệp vừa ghi', function () {
    $inUse = YonaStickers::ready();
    $borrowed = YonaStickers::ready();
    sentStickerMessage($borrowed);
    app(StickerLibraryManager::class)->deleteSticker($borrowed);
    // Tên tệp mang cạnh: tin gửi trước khi đổi cỡ vẫn mượn tệp cỡ cũ cùng thư mục.
    $borrowedOldSize = YonaStickers::ready();
    $oldSizePath = StickerFileLayout::directory($borrowedOldSize->content_hash).'/static-64.png';
    $this->disk->put($oldSizePath, 'png cỡ cũ');
    sentStickerMessage($borrowedOldSize, $oldSizePath);
    app(StickerLibraryManager::class)->deleteSticker($borrowedOldSize);
    $justUploaded = YonaStickers::ready();
    $justUploaded->delete();
    foreach ([$inUse, $borrowed, $borrowedOldSize] as $settled) {
        ageStickerFiles($settled->content_hash);
    }
    $this->disk->put('ghi-chu.txt', 'ngoài bố cục kho');
    $this->disk->put('xy/xy-khong-phai-hash/ghi-chu.txt', 'ngoài bố cục kho');
    touch($this->disk->path('xy/xy-khong-phai-hash/ghi-chu.txt'), now()->subDays(30)->getTimestamp());

    $this->artisan('stickers:prune-orphan-files')
        ->expectsOutputToContain('Đã xoá 0 thư mục tệp sticker')
        ->assertSuccessful();

    expect($this->disk->exists($inUse->static_path))->toBeTrue()
        ->and($this->disk->exists($borrowed->static_path))->toBeTrue()
        ->and($this->disk->exists($oldSizePath))->toBeTrue()
        ->and($this->disk->exists('xy/xy-khong-phai-hash/ghi-chu.txt'))->toBeTrue()
        ->and($this->disk->exists($justUploaded->original_path))->toBeTrue()
        ->and($this->disk->exists('ghi-chu.txt'))->toBeTrue();
});

it('--dry-run chỉ đếm, không xoá', function () {
    $sticker = YonaStickers::ready();
    $sticker->delete();
    ageStickerFiles($sticker->content_hash);

    $this->artisan('stickers:prune-orphan-files', ['--dry-run' => true])
        ->expectsOutputToContain('Sẽ xoá 1 thư mục tệp sticker')
        ->assertSuccessful();

    expect($this->disk->exists($sticker->static_path))->toBeTrue();
});

it('được lên lịch chạy hằng tuần', function () {
    $this->artisan('schedule:list')
        ->expectsOutputToContain('stickers:prune-orphan-files')
        ->assertSuccessful();
});

<?php

use App\Mcp\Resources\LottieAuthoringGuide;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Services\Stickers\LottieDocumentValidator;
use App\Services\Stickers\StickerLibraryManager;
use App\Services\Stickers\StickerTags;
use App\Services\Stickers\StickerUploadService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\Support\FakeStickerRenderer;
use Tests\Support\YonaStickers;

// Nhãn + từ khoá của sticker: chuẩn hoá ở một chỗ, dùng cho sửa tay, upload tệp
// và upload nội dung (Platform API, MCP).

beforeEach(function () {
    Storage::fake(Sticker::DISK);
    FakeStickerRenderer::install();
    $this->library = app(StickerLibraryManager::class);
    $this->pack = StickerPack::factory()->create();
});

function stickerFixtureContents(string $name): string
{
    return file_get_contents(base_path("tests/Fixtures/stickers/{$name}"));
}

it('updateSticker chuẩn hoá từ khoá: trim, chữ thường, gọn khoảng trắng, bỏ rỗng và trùng', function () {
    $sticker = YonaStickers::ready($this->pack, ['label' => 'Cũ', 'keywords' => ['cũ']]);

    $updated = $this->library->updateSticker($sticker, '  Mèo cảm ơn  ', ['  Cảm Ơn ', 'cảm ơn', '', '   ', 'THANKS', "ok\t  nhé", 42, null]);

    expect($updated->label)->toBe('Mèo cảm ơn')
        ->and($updated->keywords)->toBe(['cảm ơn', 'thanks', 'ok nhé'])
        ->and($sticker->fresh()->keywords)->toBe(['cảm ơn', 'thanks', 'ok nhé']);
});

it('updateSticker cắt theo trần: tối đa số từ và độ dài mỗi từ, nhãn rỗng thành null', function () {
    $sticker = YonaStickers::ready($this->pack, ['label' => 'Có nhãn']);
    $manyWords = array_map(fn (int $index) => "từ {$index}", range(1, StickerTags::MAX_KEYWORDS + 5));
    $longWord = str_repeat('ă', StickerTags::MAX_KEYWORD_LENGTH + 10);

    $updated = $this->library->updateSticker($sticker, '   ', [$longWord, ...$manyWords]);

    expect($updated->label)->toBeNull()
        ->and($updated->keywords)->toHaveCount(StickerTags::MAX_KEYWORDS)
        ->and($updated->keywords[0])->toBe(str_repeat('ă', StickerTags::MAX_KEYWORD_LENGTH))
        ->and($updated->keywords[1])->toBe('từ 1');
});

it('upload tệp nhận từ khoá tuỳ chọn và lưu dạng đã chuẩn hoá', function () {
    $file = UploadedFile::fake()->createWithContent('ball.json', stickerFixtureContents('ball-with-poster-marker.json'));

    $sticker = $this->library->upload($this->pack, $file, 'Bóng', ['Bóng ', 'nảy', 'bóng']);

    expect($sticker->fresh()->keywords)->toBe(['bóng', 'nảy'])
        ->and($sticker->fresh()->label)->toBe('Bóng');
});

it('upload không kèm từ khoá thì mảng rỗng', function () {
    $file = UploadedFile::fake()->createWithContent('ball.json', stickerFixtureContents('ball-with-poster-marker.json'));

    expect($this->library->upload($this->pack, $file)->fresh()->keywords)->toBe([]);
});

it('uploadContents đi cùng cổng kiểm với upload tệp: nhận JSON và TGS, render xong thì ready', function () {
    $fromJson = $this->library->uploadContents($this->pack, stickerFixtureContents('spinner-with-precomp.json'), 'json', 'Xoay', ['xoay']);
    $fromTgs = $this->library->uploadContents($this->pack, stickerFixtureContents('pulse-without-marker.tgs'), 'tgs');

    expect($fromJson->fresh()->status)->toBe(Sticker::STATUS_READY)
        ->and($fromJson->fresh()->keywords)->toBe(['xoay'])
        ->and($fromTgs->fresh()->status)->toBe(Sticker::STATUS_READY);
});

it('uploadContents từ chối đuôi lạ, tệp quá lớn và Lottie cấm như upload tệp', function (string $contents, string $extension, string $code) {
    expect(fn () => $this->library->uploadContents($this->pack, $contents, $extension))
        ->toThrow(ValidationException::class, __("errors.sticker_uploads.{$code}", LottieDocumentValidator::limitPlaceholders()));

    expect(Sticker::query()->count())->toBe(0);
})->with([
    'đuôi lạ' => [fn () => stickerFixtureContents('ball-with-poster-marker.json'), 'svg', StickerUploadService::UNSUPPORTED_FILE_TYPE],
    'quá lớn' => [fn () => str_repeat(' ', LottieDocumentValidator::MAX_UPLOAD_BYTES + 1), 'json', LottieDocumentValidator::FILE_TOO_LARGE],
    'lớp chữ' => [fn () => stickerFixtureContents('text-layer.json'), 'json', LottieDocumentValidator::TEXT_NOT_ALLOWED],
]);

it('bộ đầy thì uploadContents cũng bị chặn như upload tệp', function () {
    Sticker::factory()->count(StickerLibraryManager::MAX_STICKERS_PER_PACK)->for($this->pack, 'stickerPack')->create();

    expect(fn () => $this->library->uploadContents($this->pack, stickerFixtureContents('ball-with-poster-marker.json'), 'json'))
        ->toThrow(ValidationException::class);
});

it('mẫu Lottie trong hướng dẫn cho AI qua được cổng kiểm và giới hạn lấy từ hằng số', function () {
    expect(app(LottieDocumentValidator::class)->inspect(LottieAuthoringGuide::MINIMAL_EXAMPLE))->toHaveKey('document');

    $guide = LottieAuthoringGuide::markdown();
    expect($guide)
        ->toContain('tối đa '.LottieDocumentValidator::MAX_CANVAS_SIZE.' px')
        ->toContain('tối đa '.LottieDocumentValidator::MAX_DURATION_SECONDS.' giây')
        ->toContain('tối đa '.StickerTags::MAX_KEYWORDS.' từ khoá')
        ->toContain(LottieAuthoringGuide::MINIMAL_EXAMPLE)
        ->not->toMatch('/:[a-z_]+/');
});

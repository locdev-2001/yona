<?php

use App\Models\Sticker;
use App\Models\StickerPack;
use App\Services\Stickers\StickerLibraryManager;
use App\Services\Stickers\StickerTags;
use Illuminate\Support\Facades\Storage;
use Tests\Support\FakeStickerRenderer;
use Tests\Support\YonaStickers;

// Nhãn + từ khoá của sticker: chuẩn hoá ở một chỗ, dùng cho sửa tay và tải ảnh lên.

beforeEach(function () {
    Storage::fake(Sticker::DISK);
    FakeStickerRenderer::install();
    $this->library = app(StickerLibraryManager::class);
    $this->pack = StickerPack::factory()->create();
});

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
    $file = YonaStickers::imageUpload('ball.png');

    $sticker = $this->library->upload($this->pack, $file, 'Bóng', ['Bóng ', 'nảy', 'bóng']);

    expect($sticker->fresh()->keywords)->toBe(['bóng', 'nảy'])
        ->and($sticker->fresh()->label)->toBe('Bóng');
});

it('upload không kèm từ khoá thì mảng rỗng', function () {
    $file = YonaStickers::imageUpload('ball.png');

    expect($this->library->upload($this->pack, $file)->fresh()->keywords)->toBe([]);
});

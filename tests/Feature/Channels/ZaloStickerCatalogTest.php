<?php

use App\Models\Inbox;
use App\Services\Channels\ChannelActionRegistry;
use App\Services\Zalo\ZaloStickerCatalog;
use Illuminate\Support\Facades\Http;

// Driver danh mục sticker của Zalo: dựng lại sticker từ payload đã lưu (tên khoá
// khác nhau giữa chiều nhận, danh mục và bản lõi) và cắm đúng vào sổ tra driver.

function zaloStickerCatalog(): ZaloStickerCatalog
{
    return app(ZaloStickerCatalog::class);
}

it('fromStored đọc được mã bộ ở catId, cateId và cate_id', function (array $stored) {
    $sticker = zaloStickerCatalog()->fromStored($stored);

    expect($sticker?->id)->toBe('98930')
        ->and($sticker?->packId)->toBe('61900')
        ->and($sticker?->payload)->toBe([
            'id' => 98930,
            'cateId' => 61900,
            'type' => 7,
            'url' => 'https://cdn.zalo.test/98930.webp',
            'thumbnail' => 'https://cdn.zalo.test/98930.webp',
        ]);
})->with([
    'chiều nhận' => [['id' => 98930, 'catId' => 61900, 'type' => 7, 'url' => 'https://cdn.zalo.test/98930.webp']],
    'bản lõi' => [['id' => 98930, 'cateId' => 61900, 'type' => 7, 'url' => 'https://cdn.zalo.test/98930.webp']],
    'danh mục' => [['sticker_id' => '98930', 'cate_id' => '61900', 'type' => '7', 'url' => 'https://cdn.zalo.test/98930.webp']],
]);

it('fromStored ưu tiên url rồi stickerUrl, stickerWebpUrl, thumbnail', function () {
    $catalog = zaloStickerCatalog();

    expect($catalog->fromStored([
        'id' => 1,
        'stickerUrl' => 'https://cdn/sticker.png',
        'url' => 'https://cdn/url.png',
        'thumbnail' => 'https://cdn/sprite.png',
    ])?->imageUrl)->toBe('https://cdn/url.png')
        ->and($catalog->fromStored([
            'id' => 1,
            'stickerWebpUrl' => 'https://cdn/sticker.webp',
            'stickerUrl' => 'https://cdn/sticker.png',
        ])?->imageUrl)->toBe('https://cdn/sticker.png')
        ->and($catalog->fromStored(['id' => 1, 'stickerWebpUrl' => 'https://cdn/sticker.webp'])?->imageUrl)
        ->toBe('https://cdn/sticker.webp')
        ->and($catalog->fromStored(['id' => 1, 'thumbnail' => 'https://cdn/sprite.png'])?->imageUrl)
        ->toBe('https://cdn/sprite.png');
});

it('fromStored trả null khi mã không hợp lệ hoặc thiếu ảnh; bỏ nhãn dạng mã, giữ nhãn chữ', function () {
    $catalog = zaloStickerCatalog();

    expect($catalog->fromStored(['id' => 0, 'url' => 'https://cdn/a.png']))->toBeNull()
        ->and($catalog->fromStored(['id' => 'abc', 'url' => 'https://cdn/a.png']))->toBeNull()
        ->and($catalog->fromStored(['id' => 5]))->toBeNull()
        ->and($catalog->fromStored(['id' => 5, 'url' => 'javascript:alert(1)']))->toBeNull()
        ->and($catalog->fromStored(['id' => 5, 'url' => 'https://cdn/a.png', 'text' => '[^61900.5^]'])?->label)->toBeNull()
        ->and($catalog->fromStored(['id' => 5, 'url' => 'https://cdn/a.png', 'text' => 'Cảm ơn'])?->label)->toBe('Cảm ơn')
        ->and($catalog->fromStored(['id' => 5, 'url' => 'https://cdn/a.png'])?->packId)->toBeNull()
        ->and($catalog->fromStored(['id' => 5, 'url' => 'https://cdn/a.png'])?->payload['type'])->toBe(1);
});

it('sticker đã dựng lại từ tin cũ thì gửi lại không phải hỏi bridge', function () {
    Http::fake();
    $inbox = Inbox::factory()->zalo()->create();
    $catalog = zaloStickerCatalog();

    $catalog->fromStored(['id' => 98930, 'catId' => 61900, 'type' => 7, 'url' => 'https://cdn.zalo.test/98930.webp']);

    expect($catalog->find($inbox, '98930')?->payload['cateId'])->toBe(61900);
    Http::assertNothingSent();
});

it('sổ tra driver trả danh mục Zalo cho hộp thư Zalo và không có gì cho kênh khác', function () {
    expect(ChannelActionRegistry::stickers(Inbox::factory()->zalo()->create()))->toBeInstanceOf(ZaloStickerCatalog::class)
        ->and(ChannelActionRegistry::stickers(Inbox::factory()->telegram()->create()))->toBeNull()
        ->and(ChannelActionRegistry::stickers(Inbox::factory()->create()))->toBeNull();
});

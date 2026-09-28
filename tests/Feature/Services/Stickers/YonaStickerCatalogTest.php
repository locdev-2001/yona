<?php

use App\Channels\Capability;
use App\Models\Account;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Services\Channels\Stickers\Sticker as CatalogSticker;
use App\Services\Channels\Stickers\StickerCatalogException;
use App\Services\Channels\Stickers\StickerLibrary;
use App\Services\Stickers\YonaStickerCatalog;
use App\Services\Zalo\ZaloStickerCatalog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\Support\YonaStickers;

// Kho sticker Yona theo contract StickerCatalog: mã `yona:{id}`, chỉ sticker
// account thấy được (Sticker::visibleTo), payload lưu đường dẫn chứ không lưu URL,
// đính kèm là tệp mượn trên disk stickers.

/** @param list<CatalogSticker> $stickers @return list<string> */
function yonaCatalogIds(array $stickers): array
{
    return array_map(fn (CatalogSticker $sticker) => $sticker->id, $stickers);
}

function yonaCatalogInbox(?Account $account = null): Inbox
{
    return Inbox::factory()->webWidget()->create($account === null ? [] : ['account_id' => $account->id]);
}

beforeEach(function () {
    Storage::fake(Sticker::DISK);
    $this->catalog = app(YonaStickerCatalog::class);
    $this->inbox = yonaCatalogInbox();
});

it('tra sticker của kho chung theo mã yona:{id}', function () {
    $sticker = YonaStickers::ready(attributes: ['label' => 'Chào']);

    $found = $this->catalog->find($this->inbox, "yona:{$sticker->id}");

    expect($found->id)->toBe("yona:{$sticker->id}")
        ->and($found->packId)->toBe("yona:{$sticker->sticker_pack_id}")
        ->and($found->imageUrl)->toBe($sticker->poster_url)
        ->and($found->label)->toBe('Chào')
        ->and($found->payload)->toBe(YonaStickers::storedPayload($sticker));
});

it('mã không đúng dạng của kho thì không tra được', function (string $stickerId) {
    YonaStickers::ready();

    expect($this->catalog->find($this->inbox, $stickerId))->toBeNull();
})->with(['98930', 'yona:', 'yona:abc', 'yona:0', 'yona:-1', 'yona:1.5', 'zalo:1']);

it('tenant B không resolve được sticker trong kho riêng của tenant A', function () {
    $owner = Account::factory()->create(['feature_flags' => ['custom_stickers' => true]]);
    $other = Account::factory()->create(['feature_flags' => ['custom_stickers' => true]]);
    $own = YonaStickers::ready(YonaStickers::tenantPack($owner));
    $otherInbox = yonaCatalogInbox($other);

    expect($this->catalog->find(yonaCatalogInbox($owner), "yona:{$own->id}"))->not->toBeNull()
        ->and($this->catalog->find($otherInbox, "yona:{$own->id}"))->toBeNull()
        ->and(fn () => app(StickerLibrary::class)->resolve($otherInbox, "yona:{$own->id}", Capability::InboundSticker))
        ->toThrow(StickerCatalogException::class, __('errors.stickers.not_found', [], $other->locale));
});

// Cờ custom_stickers chỉ quyết ai được dựng kho riêng, không ẩn bộ đã xuất bản.
it('sticker trong kho riêng của chính tenant resolve được dù cờ custom_stickers tắt', function () {
    $owner = Account::factory()->create(['feature_flags' => ['custom_stickers' => false]]);
    $own = YonaStickers::ready(YonaStickers::tenantPack($owner));

    expect($this->catalog->find(yonaCatalogInbox($owner), "yona:{$own->id}"))->not->toBeNull();
});

// `_` giờ là ký tự ngăn cách của search_fold (như mọi ô tìm khác), không còn là
// chữ; ký tự đại diện `%` vẫn phải là chữ thường.
it('tìm theo nhãn hoặc từ khoá, không phân biệt hoa thường; ký tự đại diện của LIKE là chữ thường', function () {
    $pack = StickerPack::factory()->create();
    $hello = YonaStickers::ready($pack, ['label' => 'Hello bạn', 'position' => 1]);
    $thanks = YonaStickers::ready($pack, ['label' => 'Cảm ơn', 'keywords' => ['thank you', 'hello again'], 'position' => 2]);
    YonaStickers::ready($pack, ['label' => 'Buồn', 'position' => 3]);
    $sale = YonaStickers::ready($pack, ['label' => 'Giảm 50%', 'position' => 4]);
    YonaStickers::ready(StickerPack::factory()->unpublished()->create(), ['label' => 'Hello ẩn']);

    expect(yonaCatalogIds($this->catalog->search($this->inbox, 'HELLO')))->toBe(["yona:{$hello->id}", "yona:{$thanks->id}"])
        ->and(yonaCatalogIds($this->catalog->search($this->inbox, '50%')))->toBe(["yona:{$sale->id}"])
        ->and($this->catalog->search($this->inbox, 'Giảm 5%0'))->toBe([]);
});

it('bảng chọn tìm không dấu theo từng chữ, cả nhãn lẫn từ khoá', function () {
    $pack = StickerPack::factory()->create();
    $plainKeyword = YonaStickers::ready($pack, ['label' => 'Mèo', 'keywords' => ['cam on'], 'position' => 1]);
    $accentedLabel = YonaStickers::ready($pack, ['label' => 'Chó cảm ơn', 'position' => 2]);
    YonaStickers::ready($pack, ['label' => 'Buồn', 'position' => 3]);

    expect(yonaCatalogIds($this->catalog->search($this->inbox, 'cảm ơn')))->toBe(["yona:{$plainKeyword->id}", "yona:{$accentedLabel->id}"])
        ->and(yonaCatalogIds($this->catalog->search($this->inbox, 'ON CAM')))->toBe(["yona:{$plainKeyword->id}", "yona:{$accentedLabel->id}"])
        ->and(yonaCatalogIds($this->catalog->search($this->inbox, 'đường')))->toBe([]);
});

it('theo bộ trả sticker của bộ theo thứ tự trong bộ; mã bộ lạ trả rỗng', function () {
    $pack = StickerPack::factory()->create();
    $second = YonaStickers::ready($pack, ['position' => 2]);
    $first = YonaStickers::ready($pack, ['position' => 1]);
    YonaStickers::ready();

    expect(yonaCatalogIds($this->catalog->pack($this->inbox, "yona:{$pack->id}")))->toBe(["yona:{$first->id}", "yona:{$second->id}"])
        ->and($this->catalog->pack($this->inbox, (string) $pack->id))->toBe([])
        ->and($this->catalog->pack($this->inbox, 'yona:khong-phai-so'))->toBe([]);
});

it('dựng lại sticker từ payload đã lưu mà không truy vấn', function () {
    $sticker = YonaStickers::ready();
    $payload = YonaStickers::storedPayload($sticker);

    DB::enableQueryLog();
    $rebuilt = $this->catalog->fromStored($payload);

    expect(DB::getQueryLog())->toBe([])
        ->and($rebuilt->id)->toBe("yona:{$sticker->id}")
        ->and($rebuilt->imageUrl)->toBe($sticker->poster_url)
        ->and($rebuilt->payload)->toBe($payload);
});

it('chỉ nhận payload khai nguồn yona; payload Zalo và payload widget cũ không phải của kho', function (array $stored) {
    expect($this->catalog->fromStored($stored))->toBeNull();
})->with([
    'sticker Zalo' => [['id' => 98930, 'cateId' => 61900, 'type' => 7, 'url' => 'https://zalo-api.zadn.vn/sticker/98930.webp']],
    'sticker widget cũ' => [['id' => 'cho-vay-tay', 'cateId' => 'cho', 'url' => 'https://cdn.example/cho.png', 'thumbnail' => 'https://cdn.example/cho.png']],
    'thiếu ảnh tĩnh' => [['source' => 'yona', 'id' => 1, 'pack_id' => 1, 'animation_path' => 'a/anim.json', 'poster_path' => 'a/poster.webp']],
    'mã không hợp lệ' => [['source' => 'yona', 'id' => 0, 'pack_id' => 1, 'animation_path' => 'a', 'poster_path' => 'b', 'static_path' => 'c']],
]);

it('danh mục Zalo không nhận payload của kho Yona', function () {
    $payload = YonaStickers::storedPayload(YonaStickers::ready());

    expect(app(ZaloStickerCatalog::class)->fromStored($payload))->toBeNull()
        ->and(app(ZaloStickerCatalog::class)->fromStored([...$payload, 'url' => 'https://cdn.zalo.test/1.webp']))->toBeNull();
});

it('đính kèm là tệp mượn trên disk stickers trỏ ảnh tĩnh, không bao giờ nằm trên disk public', function () {
    $sticker = YonaStickers::ready(attributes: ['width' => 320, 'height' => 240]);

    $attachment = $this->catalog->attachmentFor($this->catalog->fromStored(YonaStickers::storedPayload($sticker)), $this->inbox);

    expect($attachment->disk)->toBe(Sticker::DISK)
        ->and($attachment->path)->toBe($sticker->static_path)
        ->and($attachment->file_type)->toBe(Attachment::FILE_TYPE_IMAGE)
        ->and($attachment->content_type)->toBe('image/png')
        ->and($attachment->filename)->toBe("sticker-{$sticker->id}.png")
        ->and($attachment->meta)->toBe(['width' => 320, 'height' => 240])
        ->and($attachment->account_id)->toBe($this->inbox->account_id)
        ->and($attachment->external_url)->toBeNull()
        ->and($attachment->ownsStoredFile())->toBeFalse();
});

it('payload đã lưu không chứa URL; người đọc nhận URL dựng lúc đọc, payload nguồn khác giữ nguyên', function () {
    $sticker = YonaStickers::ready();
    $payload = YonaStickers::storedPayload($sticker);
    $zalo = ['id' => 98930, 'cateId' => 61900, 'type' => 7, 'url' => 'https://zalo-api.zadn.vn/sticker/98930.webp'];
    $legacyWidget = ['id' => 'cho-vay-tay', 'cateId' => 'cho', 'url' => 'https://cdn.example/cho.png', 'thumbnail' => 'https://cdn.example/cho.png'];

    expect(json_encode($payload))->not->toContain('://')
        ->and($this->catalog->forReader($payload))->toBe(YonaStickers::readerPayload($sticker))
        ->and($this->catalog->forReader($payload)['url'])->toBe(Storage::disk(Sticker::DISK)->url($sticker->static_path))
        ->and($this->catalog->forReader($zalo))->toBe($zalo)
        ->and($this->catalog->forReader($legacyWidget))->toBe($legacyWidget);
});

it('gần đây gồm sticker Yona đã dùng trong hộp thư, bỏ sticker account không còn thấy; bộ của kho luôn có để duyệt', function () {
    $pack = StickerPack::factory()->create(['position' => 1]);
    $kept = YonaStickers::ready($pack);
    $retiredPack = StickerPack::factory()->create(['position' => 2]);
    $retired = YonaStickers::ready($retiredPack);
    $conversation = Conversation::factory()->create(['account_id' => $this->inbox->account_id, 'inbox_id' => $this->inbox->id]);

    foreach ([$retired, $kept, $kept] as $sticker) {
        $conversation->messages()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'message_type' => Message::TYPE_INCOMING,
            'content_type' => Message::CONTENT_TYPES['sticker'],
            'content_attributes' => ['sticker' => YonaStickers::storedPayload($sticker)],
        ]);
        $this->travel(1)->minutes();
    }

    $retiredPack->update(['published_at' => null]);

    expect(app(StickerLibrary::class)->browse($this->inbox, null, null))->toBe([
        'source' => StickerLibrary::SOURCE_RECENT,
        'query' => null,
        'pack_id' => null,
        'stickers' => [
            ['id' => "yona:{$kept->id}", 'image_url' => $kept->poster_url, 'pack_id' => "yona:{$pack->id}", 'label' => null],
        ],
        'packs' => [
            ['id' => "yona:{$pack->id}", 'cover_url' => $kept->poster_url],
        ],
    ]);
});

it('gần đây đọc kho Yona bằng số truy vấn cố định, không theo số sticker đã dùng', function () {
    $conversation = Conversation::factory()->create(['account_id' => $this->inbox->account_id, 'inbox_id' => $this->inbox->id]);
    $sendStickers = function (int $count) use ($conversation): void {
        foreach (range(1, $count) as $ignored) {
            $conversation->messages()->create([
                'account_id' => $conversation->account_id,
                'inbox_id' => $conversation->inbox_id,
                'message_type' => Message::TYPE_INCOMING,
                'content_type' => Message::CONTENT_TYPES['sticker'],
                'content_attributes' => ['sticker' => YonaStickers::storedPayload(YonaStickers::ready())],
            ]);
        }
    };
    $countQueries = function (): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        app(StickerLibrary::class)->browse($this->inbox->fresh(), null, null);
        DB::disableQueryLog();

        return count(DB::getQueryLog());
    };

    $sendStickers(2);
    $withTwo = $countQueries();
    $sendStickers(4);
    $withSix = $countQueries();

    expect(app(StickerLibrary::class)->browse($this->inbox->fresh(), null, null)['stickers'])->toHaveCount(6)
        ->and($withSix)->toBe($withTwo);
});

it('mỗi bộ của kho một mục theo thứ tự bộ, ảnh bìa là sticker đầu tiên của bộ', function () {
    $laterPack = StickerPack::factory()->create(['position' => 2]);
    $firstPack = StickerPack::factory()->create(['position' => 1]);
    YonaStickers::ready($laterPack, ['position' => 1]);
    $laterCover = YonaStickers::ready($laterPack, ['position' => 0]);
    YonaStickers::ready($firstPack, ['position' => 3]);
    $firstCover = YonaStickers::ready($firstPack, ['position' => 1]);

    expect($this->catalog->packs($this->inbox->account))->toBe([
        ['id' => "yona:{$firstPack->id}", 'cover_url' => $firstCover->poster_url],
        ['id' => "yona:{$laterPack->id}", 'cover_url' => $laterCover->poster_url],
    ]);
});

it('bảng chọn theo bộ của kho định tuyến theo tiền tố mã bộ', function () {
    $pack = StickerPack::factory()->create();
    $sticker = YonaStickers::ready($pack, ['label' => 'Vẫy tay']);

    expect(app(StickerLibrary::class)->browse($this->inbox, null, "yona:{$pack->id}"))->toBe([
        'source' => StickerLibrary::SOURCE_PACK,
        'query' => null,
        'pack_id' => "yona:{$pack->id}",
        'stickers' => [
            ['id' => "yona:{$sticker->id}", 'image_url' => $sticker->poster_url, 'pack_id' => "yona:{$pack->id}", 'label' => 'Vẫy tay'],
        ],
        'packs' => [],
    ]);
});

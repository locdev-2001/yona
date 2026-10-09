<?php

use App\Models\Attachment;
use App\Models\Message;

/** @return array<string, mixed> */
function photoZcaMessage(array $params): array
{
    return [
        'msgId' => '9000000001',
        'msgType' => 'chat.photo',
        'content' => [
            'title' => null,
            'href' => 'https://cdn.zalo.test/custom/c652.jpg',
            'params' => json_encode(['width' => 130, 'height' => 130, 'hd' => 'https://cdn.zalo.test/custom/c652.jpg', ...$params]),
        ],
    ];
}

function photoMessageWithImage(array $attributes): Message
{
    $message = Message::factory()->create($attributes);
    $message->attachments()->create([
        'account_id' => $message->account_id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'path' => 'attachments/'.$message->account_id.'/c652.jpg',
        'filename' => 'c652.jpg',
        'content_type' => 'image/jpeg',
    ]);

    return $message;
}

beforeEach(function () {
    $webp = ['url' => 'https://yona.test/storage/stickers/86/86b8aa/sticker-130.webp', 'width' => 130, 'height' => 130];

    $this->customSticker = photoMessageWithImage([
        'content' => null,
        'content_attributes' => ['zca_message' => photoZcaMessage(['pStickerType' => 1, 'contentId' => '1791514839303', 'webp' => $webp])],
    ]);
    $this->plainPhoto = photoMessageWithImage([
        'content' => 'Ảnh sản phẩm',
        'content_attributes' => ['zca_message' => photoZcaMessage([])],
    ]);
    $this->platformSticker = Message::factory()->create([
        'content' => null,
        'content_type' => Message::CONTENT_TYPES['sticker'],
        'content_attributes' => ['sticker' => ['id' => 98930, 'url' => 'https://cdn.zalo.test/sticker.webp']],
    ]);
});

it('chuyển ảnh mang pStickerType thành tin sticker, giữ đính kèm, không đụng ảnh thường', function () {
    $this->artisan('messages:repair-zalo-custom-stickers')
        ->expectsOutputToContain('Đã chuyển 1 tin thành sticker')
        ->assertSuccessful();

    $repaired = $this->customSticker->refresh();

    expect($repaired->content_type)->toBe(Message::CONTENT_TYPES['sticker'])
        ->and($repaired->content_attributes['sticker'])->toBe([
            'source' => 'zalo_custom',
            'id' => '1791514839303',
            'url' => 'https://yona.test/storage/stickers/86/86b8aa/sticker-130.webp',
            'width' => 130,
            'height' => 130,
        ])
        ->and($repaired->content_attributes['zca_message']['msgType'])->toBe('chat.photo')
        ->and($repaired->attachments()->count())->toBe(1)
        ->and($this->plainPhoto->refresh()->content_type)->toBe(Message::CONTENT_TYPES['text'])
        ->and($this->plainPhoto->content)->toBe('Ảnh sản phẩm')
        ->and(Attachment::query()->excludingStickers()->pluck('attachable_id')->all())->toBe([$this->plainPhoto->id]);
});

it('chạy lại không đổi gì thêm', function () {
    $this->artisan('messages:repair-zalo-custom-stickers')->assertSuccessful();

    $this->artisan('messages:repair-zalo-custom-stickers')
        ->expectsOutputToContain('Đã chuyển 0 tin thành sticker')
        ->assertSuccessful();
});

it('--dry-run chỉ in số đếm và id, không ghi gì', function () {
    $this->artisan('messages:repair-zalo-custom-stickers', ['--dry-run' => true])
        ->expectsOutputToContain("#{$this->customSticker->id}")
        ->expectsOutputToContain('Thử chạy: 1 tin sẽ chuyển thành sticker')
        ->assertSuccessful();

    expect($this->customSticker->refresh()->content_type)->toBe(Message::CONTENT_TYPES['text'])
        ->and($this->customSticker->content_attributes)->not->toHaveKey('sticker');
});

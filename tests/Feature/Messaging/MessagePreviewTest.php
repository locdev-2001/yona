<?php

use App\Http\Resources\MessageResource;
use App\Messaging\MessagePreview;
use App\Models\Attachment;
use App\Models\Message;

function stickerMessage(array $attributes = [], ?string $imageUrl = 'https://cdn.yona.test/stickers/wave.png'): Message
{
    $message = Message::factory()->create([
        'content' => null,
        'content_type' => Message::CONTENT_TYPES['sticker'],
        'content_attributes' => ['sticker' => ['id' => 'wave']],
        ...$attributes,
    ]);

    if ($imageUrl !== null) {
        $message->attachments()->create(['account_id' => $message->account_id, 'file_type' => Attachment::FILE_TYPE_IMAGE, 'external_url' => $imageUrl]);
    }

    return $message->fresh('attachments');
}

beforeEach(fn () => app()->setLocale('vi'));

it('sticker Yona mang ảnh PNG đính kèm vẫn xem trước là Sticker, không phải ảnh', function () {
    expect(app(MessagePreview::class)->for(stickerMessage()))->toBe('Sticker');
});

it('sticker Zalo kèm chữ mô tả vẫn xem trước là Sticker', function () {
    $message = stickerMessage(
        ['content' => 'haha', 'content_attributes' => ['sticker' => ['id' => 98930, 'catId' => 10, 'text' => 'haha']]],
        'https://zalo-api.zadn.vn/sticker/98930.webp',
    );

    expect(app(MessagePreview::class)->for($message))->toBe('Sticker');
});

it('sticker đã thu hồi xem trước là tin đã thu hồi', function () {
    $message = stickerMessage(['content_attributes' => ['sticker' => ['id' => 'wave'], 'deleted' => true]]);

    expect(app(MessagePreview::class)->for($message))->toBe(__('messaging.preview.deleted'));
});

it('ảnh không chữ vẫn là Đã gửi một ảnh', function () {
    $message = stickerMessage(['content_type' => Message::CONTENT_TYPES['text'], 'content_attributes' => []]);

    expect(app(MessagePreview::class)->for($message))->toBe('Đã gửi một ảnh');
});

it('realtime gửi sẵn dòng xem trước cho sticker, tin chữ thì không', function () {
    $text = Message::factory()->create(['content' => 'Dạ còn hàng ạ']);

    expect(MessageResource::pushEventData(stickerMessage())['preview_text'])->toBe('Sticker')
        ->and(MessageResource::pushEventData($text)['preview_text'])->toBeNull();
});

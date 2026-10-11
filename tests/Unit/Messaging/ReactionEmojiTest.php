<?php

use App\Http\Resources\MessageResource;
use App\Messaging\Reactions\ReactionEmoji;
use App\Models\Message;

it('thêm dấu chọn kiểu emoji cho ký hiệu trần mà kênh gửi về', function (string $raw, string $expected) {
    expect(ReactionEmoji::normalize($raw))->toBe($expected);
})->with([
    'tim Messenger trần' => ["\u{2764}", "\u{2764}\u{FE0F}"],
    'tim đã có dấu chọn giữ nguyên' => ["\u{2764}\u{FE0F}", "\u{2764}\u{FE0F}"],
    'mặt cười vùng emoji giữ nguyên' => ['😂', '😂'],
    'ngón cái kèm màu da giữ nguyên' => ["\u{1F44D}\u{1F3FD}", "\u{1F44D}\u{1F3FD}"],
    'chữ thường giữ nguyên' => ['a', 'a'],
]);

it('rỗng và null đi qua nguyên vẹn', function () {
    expect(ReactionEmoji::normalize(null))->toBeNull()
        ->and(ReactionEmoji::normalize(''))->toBe('');
});

it('MessageResource lộ cảm xúc đã chuẩn hoá dù bản ghi lưu emoji trần', function () {
    $message = new Message([
        'content_attributes' => ['reactions' => [['emoji' => "\u{2764}", 'by' => '28714465644869770', 'at' => 1]]],
    ]);

    expect(MessageResource::contentAttributes($message)['reactions'][0]['emoji'])->toBe("\u{2764}\u{FE0F}");
});

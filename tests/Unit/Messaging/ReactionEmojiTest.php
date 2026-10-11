<?php

use App\Messaging\Reactions\ReactionEmoji;

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

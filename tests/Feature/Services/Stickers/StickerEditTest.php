<?php

use App\Services\Stickers\StickerEdit;

// Thông số cắt + xoá nền theo hợp đồng chung của API tải lên, cột edit_params và
// tệp --edit của trình dựng: kiểm cấu trúc, chuẩn hoá để cùng chỉnh = cùng chuỗi.

it('chuẩn hoá đúng hợp đồng: giữ khoá đã gửi theo thứ tự cố định, bỏ khoá lạ, số nguyên viết như số nguyên', function () {
    $edit = StickerEdit::fromJson(json_encode([
        'edits' => [
            ['tolerance' => 12.0, 'y' => 0.1, 'x' => 0.5, 'op' => 'wand-remove'],
            ['radius' => 0.03, 'points' => [[0.4, 0.4], [0.45, 0.42]], 'op' => 'brush-keep'],
        ],
        'feather' => 1,
        'unknown' => 'bỏ qua',
        'tolerance' => 12,
        'removeBackground' => true,
        'crop' => ['h' => 0.8, 'w' => 0.8, 'y' => 0.05, 'x' => 0.1],
    ]));

    expect($edit->params)->toBe([
        'crop' => ['x' => 0.1, 'y' => 0.05, 'w' => 0.8, 'h' => 0.8],
        'removeBackground' => true,
        'tolerance' => 12,
        'feather' => 1,
        'edits' => [
            ['op' => 'wand-remove', 'x' => 0.5, 'y' => 0.1, 'tolerance' => 12],
            ['op' => 'brush-keep', 'points' => [[0.4, 0.4], [0.45, 0.42]], 'radius' => 0.03],
        ],
    ])
        ->and($edit->json())->toBe('{"crop":{"x":0.1,"y":0.05,"w":0.8,"h":0.8},"removeBackground":true,"tolerance":12,"feather":1,"edits":[{"op":"wand-remove","x":0.5,"y":0.1,"tolerance":12},{"op":"brush-keep","points":[[0.4,0.4],[0.45,0.42]],"radius":0.03}]}');
});

it('cùng chỉnh sửa viết khác nhau ra cùng một chuỗi', function () {
    $compact = StickerEdit::fromJson('{"tolerance":20,"removeBackground":false}');
    $spaced = StickerEdit::fromJson("{ \"removeBackground\" : false,\n \"tolerance\" : 20.0 }");

    expect($spaced->json())->toBe($compact->json());
});

it('trống, null, object rỗng hay crop null là không chỉnh', function (?string $json) {
    expect(StickerEdit::fromJson($json)->isEmpty())->toBeTrue();
})->with(['null' => [null], 'chuỗi rỗng' => [''], 'khoảng trắng' => ['  '], 'object rỗng' => ['{}'], 'crop null' => ['{"crop":null}']]);

it('fit contain được giữ, fit cover (mặc định) không ghi để hash sticker cũ không đổi', function () {
    expect(StickerEdit::fromJson('{"removeBackground":true,"fit":"contain","crop":{"x":-1,"y":0,"w":3,"h":1}}')->json())
        ->toBe('{"crop":{"x":-1,"y":0,"w":3,"h":1},"fit":"contain","removeBackground":true}')
        ->and(StickerEdit::fromJson('{"fit":"cover","tolerance":20}')->json())
        ->toBe(StickerEdit::fromJson('{"tolerance":20}')->json());
});

it('wand không ghi dung sai thì để trình dựng dùng mặc định', function () {
    expect(StickerEdit::fromJson('{"edits":[{"op":"wand-keep","x":0,"y":1}]}')->params)
        ->toBe(['edits' => [['op' => 'wand-keep', 'x' => 0, 'y' => 1]]]);
});

it('nhận biên của hợp đồng', function (array $edit) {
    expect(StickerEdit::fromJson(json_encode($edit))->isEmpty())->toBeFalse();
})->with([
    'crop cả ảnh' => [['crop' => ['x' => 0, 'y' => 0, 'w' => 1, 'h' => 1]]],
    'crop sát mép phải dưới' => [['crop' => ['x' => 0.7, 'y' => 0.3, 'w' => 0.3, 'h' => 0.7]]],
    'crop tràn ảnh (phần vượt trong suốt)' => [['crop' => ['x' => 0.5, 'y' => 0, 'w' => 0.6, 'h' => 1]]],
    'khung vuông lớn hơn cạnh ngắn của ảnh dọc' => [['crop' => ['x' => -1, 'y' => 0, 'w' => 3, 'h' => 1]]],
    'crop vượt biên đúng trần' => [['crop' => ['x' => -StickerEdit::MAX_CROP_OVERFLOW, 'y' => -StickerEdit::MAX_CROP_OVERFLOW, 'w' => 1 + 2 * StickerEdit::MAX_CROP_OVERFLOW, 'h' => 1 + 2 * StickerEdit::MAX_CROP_OVERFLOW]]],
    'fit contain' => [['fit' => 'contain']],
    'dung sai và làm mềm tối đa' => [['tolerance' => 100, 'feather' => 4]],
    'đủ số lượt chỉnh' => [['edits' => array_fill(0, StickerEdit::MAX_EDITS, ['op' => 'wand-remove', 'x' => 0.5, 'y' => 0.5])]],
    'đủ số điểm cọ' => [['edits' => [['op' => 'brush-remove', 'points' => array_fill(0, StickerEdit::MAX_BRUSH_POINTS, [0.5, 0.5]), 'radius' => 1]]]],
]);

it('từ chối thông số sai hợp đồng', function (string $json) {
    expect(fn () => StickerEdit::fromJson($json))->toThrow(InvalidArgumentException::class);
})->with([
    'JSON hỏng' => ['{"crop":'],
    'mảng' => ['[1,2,3]'],
    'chuỗi' => ['"crop"'],
    'crop không phải object' => ['{"crop":[0,0,1,1]}'],
    'crop thiếu cạnh' => ['{"crop":{"x":0,"y":0,"w":1}}'],
    'crop vượt biên quá trần' => ['{"crop":{"x":-9,"y":0,"w":10,"h":1}}'],
    'crop tràn phải quá trần' => ['{"crop":{"x":0.5,"y":0,"w":9,"h":1}}'],
    'crop không giao ảnh' => ['{"crop":{"x":-3,"y":0,"w":2,"h":1}}'],
    'crop bắt đầu ở mép phải' => ['{"crop":{"x":1,"y":0,"w":1,"h":1}}'],
    'fit lạ' => ['{"fit":"stretch"}'],
    'fit không phải chuỗi' => ['{"fit":1}'],
    'crop cạnh bằng 0' => ['{"crop":{"x":0,"y":0,"w":0,"h":1}}'],
    'removeBackground là chuỗi' => ['{"removeBackground":"true"}'],
    'dung sai là chuỗi' => ['{"tolerance":"12"}'],
    'dung sai vượt 100' => ['{"tolerance":100.5}'],
    'làm mềm vượt 4' => ['{"feather":5}'],
    'edits không phải danh sách' => ['{"edits":{"op":"wand-remove"}}'],
    'thao tác lạ' => ['{"edits":[{"op":"lasso","x":0.5,"y":0.5}]}'],
    'wand thiếu toạ độ' => ['{"edits":[{"op":"wand-remove","x":0.5}]}'],
    'wand ngoài ảnh' => ['{"edits":[{"op":"wand-remove","x":1.5,"y":0.5}]}'],
    'cọ không có điểm' => ['{"edits":[{"op":"brush-keep","points":[],"radius":0.1}]}'],
    'điểm cọ ba toạ độ' => ['{"edits":[{"op":"brush-keep","points":[[0.1,0.2,0.3]],"radius":0.1}]}'],
    'cọ thiếu bán kính' => ['{"edits":[{"op":"brush-keep","points":[[0.1,0.2]]}]}'],
    'bán kính vượt 1' => ['{"edits":[{"op":"brush-keep","points":[[0.1,0.2]],"radius":1.5}]}'],
    'quá số lượt chỉnh' => [json_encode(['edits' => array_fill(0, StickerEdit::MAX_EDITS + 1, ['op' => 'wand-remove', 'x' => 0.5, 'y' => 0.5])])],
    'quá số điểm cọ' => [json_encode(['edits' => [['op' => 'brush-remove', 'points' => array_fill(0, StickerEdit::MAX_BRUSH_POINTS + 1, [0.5, 0.5]), 'radius' => 0.1]]])],
    'vượt trần dung lượng tệp --edit' => [json_encode(['edits' => array_fill(0, StickerEdit::MAX_EDITS, ['op' => 'brush-remove', 'points' => array_fill(0, StickerEdit::MAX_BRUSH_POINTS, [0.123456789, 0.987654321]), 'radius' => 0.1])])],
    'lồng quá sâu' => [str_repeat('{"a":', 20).'1'.str_repeat('}', 20)],
]);

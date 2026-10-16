<?php

use App\Agent\Tools\Runner\ClaimGuard;
use App\Agent\Tools\Runner\MoneyMentions;
use App\Agent\ValueObjects\TurnEvidence;

it('reads every common way of writing an amount', function (string $text, array $expected) {
    expect(MoneyMentions::in($text))->toBe($expected);
})->with([
    'k suffix' => ['Áo này 450k ạ', ['VND:450000']],
    'upper K with space' => ['giá 450 K', ['VND:450000']],
    'dong sign' => ['chỉ 450.000đ thôi', ['VND:450000']],
    'comma thousands and VND' => ['1,250,000 VND', ['VND:1250000']],
    'currency symbol' => ['450.000 ₫', ['VND:450000']],
    'short million' => ['combo 1tr2 nhé', ['VND:1200000']],
    'decimal million' => ['1,5 triệu', ['VND:1500000']],
    'plain million' => ['2tr', ['VND:2000000']],
    'thousand word' => ['450 nghìn', ['VND:450000']],
    'billion' => ['căn hộ 2 tỷ', ['VND:2000000000']],
    'dollars' => ['$20 or 15 USD', ['USD:20', 'USD:15']],
    'percent' => ['giảm 20% hôm nay', ['PCT:20']],
    'grouped number alone' => ['giá 450.000', ['VND:450000']],
    'several amounts' => ['áo 150k, quần 200.000đ', ['VND:150000', 'VND:200000']],
]);

it('ignores numbers that are not money', function (string $text) {
    expect(MoneyMentions::in($text))->toBe([]);
})->with([
    'size' => ['size 42 còn ạ'],
    'quantity' => ['mua 2 cái'],
    'weight' => ['nặng 2kg'],
    'date' => ['giao ngày 15.10.2026'],
    'time' => ['mở cửa 9:00 tới 21:30'],
    'phone' => ['gọi 0901234567 nhé'],
    'no numbers' => ['Dạ em chào anh ạ'],
]);

it('reads a two-digit tail after triệu/tỷ as ambiguous, never as one amount', function (string $text, string $fragment, array $readings) {
    expect(MoneyMentions::in($text))->toBe([])
        ->and(MoneyMentions::ambiguous($text))->toBe([$fragment])
        ->and(MoneyMentions::sourced($text))->toEqualCanonicalizing($readings);
})->with([
    'two digits after triệu' => ['giá 1 triệu 50 ạ', '1 triệu 50', ['VND:1500000', 'VND:1050000']],
    'two digits after tr' => ['combo 1tr50', '1tr50', ['VND:1500000', 'VND:1050000']],
    'two digits after tỷ' => ['căn hộ 2 tỷ 50', '2 tỷ 50', ['VND:2500000000', 'VND:2050000000']],
]);

it('reads a three-digit tail after triệu as one amount', function () {
    expect(MoneyMentions::in('1 triệu 250'))->toBe(['VND:1250000'])
        ->and(MoneyMentions::ambiguous('1 triệu 250'))->toBe([]);
});

it('lets a reply state only amounts found in this turn\'s tool results', function (string $reply, string $evidence, bool $allowed) {
    $result = (new ClaimGuard)->check($reply, new TurnEvidence([$evidence]));

    expect($result === null)->toBe($allowed);
})->with([
    'same amount written differently' => ['Dạ áo giá 150k ạ', '{"ok":true,"data":[{"excerpt":"Áo thun trắng giá 150.000đ."}]}', true],
    'bare number in data' => ['Dạ 1tr2 ạ', '{"ok":true,"data":[{"price":1200000}]}', true],
    'percentage from a promotion' => ['Đang giảm 20% ạ', '{"ok":true,"data":[{"excerpt":"Giảm 20% cho đơn đầu."}]}', true],
    'no amount at all' => ['Dạ em kiểm tra rồi báo anh nhé', '{"ok":true,"data":[]}', true],
    'amount not in data' => ['Dạ áo giá 450k ạ', '{"ok":true,"data":[{"excerpt":"Áo thun trắng giá 150.000đ."}]}', false],
    'one of two amounts missing' => ['Áo 150k, quần 300k', '{"ok":true,"data":[{"excerpt":"Áo 150.000đ"}]}', false],
    'no evidence' => ['Phí ship 30k ạ', '', false],
    'source written with a short tail' => ['Dạ combo giá 1.050.000đ ạ', '{"ok":true,"data":[{"excerpt":"Combo 1 triệu 50."}]}', true],
    'source with a one-digit tail' => ['Dạ combo giá 1.200.000đ ạ', '{"ok":true,"data":[{"excerpt":"Combo 1tr2."}]}', true],
    'id of a saved reply is not a price' => ['Dạ áo giá 2.500đ ạ', '{"ok":true,"data":[{"ref":"canned_response:2500","kind":"canned_response","excerpt":"Áo thun trắng còn size M."}]}', false],
    'id inside the text is not a price' => ['Dạ phí 3.100đ ạ', 'Xem bài article:3100 nhé', false],
    'a year is not a price' => ['Dạ áo giá 2.026đ ạ', '{"ok":true,"data":[{"excerpt":"Bộ sưu tập thu đông 2026."}]}', false],
    'a price glued to its label' => ['Dạ áo giá 450.000đ ạ', 'Áo thun Giá:450000', true],
    'a four digit price still counts' => ['Dạ phí gói 2.500đ ạ', '{"ok":true,"data":[{"price":2500}]}', true],
    'a price written with its unit, even in a year range' => ['Dạ áo giá 2.000đ ạ', '{"ok":true,"data":[{"excerpt":"Giá 2000đ."}]}', true],
    'reply with an ambiguous tail, even if sourced' => ['Dạ combo giá 1 triệu 50 ạ', '{"ok":true,"data":[{"excerpt":"Combo 1.050.000đ."}]}', false],
]);

it('asks for the full amount when the reply writes one ambiguously', function () {
    $result = (new ClaimGuard)->check('Dạ combo giá 1tr50 ạ', new TurnEvidence(['{"ok":true,"data":[{"excerpt":"Combo 1.050.000đ."}]}']));

    expect($result->toArray()['error']['code'])->toBe('invalid_args')
        ->and($result->fix)->toContain('1tr50')
        ->and($result->fix)->toContain('1.050.000đ');
});

it('explains the refusal with the code, the amounts and how to recover', function () {
    $result = (new ClaimGuard)->check('Dạ áo giá 450k, giảm 10% ạ', new TurnEvidence);

    expect($result->toArray()['error']['code'])->toBe('unsourced_claim')
        ->and($result->fix)->toContain('450000 VND')
        ->and($result->fix)->toContain('10%')
        ->and($result->fix)->toContain('handoff_to_human');
});

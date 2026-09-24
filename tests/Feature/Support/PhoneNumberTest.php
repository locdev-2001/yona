<?php

use App\Support\PhoneNumber;

it('quy số Việt Nam gõ theo mọi kiểu về cùng một chuỗi E.164', function (string $typed) {
    expect(PhoneNumber::normalize($typed))->toBe('+84912345678');
})->with([
    'số 0 đầu' => '0912345678',
    'có khoảng trắng' => '0912 345 678',
    'có dấu chấm' => '0912.345.678',
    'có gạch nối' => '0912-345-678',
    'mã nước thiếu dấu +' => '84912345678',
    'đã là E.164' => '+84912345678',
    'thiếu số 0 đầu' => '912345678',
    'mã nước kèm số 0' => '+84 (0) 912 345 678',
    'mã nước kèm số 0 thiếu dấu +' => '840912345678',
    'tiền tố quốc tế 00' => '0084912345678',
]);

it('nhận số cố định 10 chữ số sau mã nước', function () {
    expect(PhoneNumber::normalize('028 3812 3456'))->toBe('+842838123456');
});

it('số trần bắt đầu bằng 84 nhưng không đủ độ dài thì hiểu là số thiếu số 0', function () {
    expect(PhoneNumber::normalize('845123456'))->toBe('+84845123456');
});

it('giữ nguyên số nước ngoài có mã nước', function (string $typed, string $expected) {
    expect(PhoneNumber::normalize($typed))->toBe($expected);
})->with([
    ['+12025550123', '+12025550123'],
    ['+1 (202) 555-0123', '+12025550123'],
    ['0012025550123', '+12025550123'],
    // CSV xuất từ Excel hay mất dấu +: số quá dài cho số trong nước là số quốc tế.
    ['918080808080', '+918080808080'],
]);

it('trả null cho chuỗi không phải số điện thoại', function (?string $typed) {
    expect(PhoneNumber::normalize($typed))->toBeNull();
})->with([null, '', '   ', 'abc', '09x12345678', '12', '45623239', '+', '+0912345678', '09+12345678']);

it('nguồn máy không đoán mã nước cho số thiếu tiền tố', function () {
    expect(PhoneNumber::normalize('912345678', acceptBareNationalNumber: false))->toBeNull()
        ->and(PhoneNumber::normalize('0912345678', acceptBareNationalNumber: false))->toBe('+84912345678')
        ->and(PhoneNumber::normalize('84912345678', acceptBareNationalNumber: false))->toBe('+84912345678');
});

it('lấy quốc gia mặc định từ cấu hình', function () {
    config([
        'yona.phone_numbers.default_country' => 'US',
        'yona.phone_numbers.countries.US' => ['calling_code' => '1', 'trunk_prefix' => '', 'national_number_lengths' => [10]],
    ]);

    expect(PhoneNumber::normalize('202 555 0123'))->toBe('+12025550123')
        ->and(PhoneNumber::normalize('+84912345678'))->toBe('+84912345678');
});

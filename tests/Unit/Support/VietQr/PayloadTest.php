<?php

use App\Support\VietQr\Payload;

// Đọc TLV (id 2 số + độ dài 2 số + giá trị) tuần tự từ đầu chuỗi, trả về mảng
// ['id' => value] theo đúng thứ tự xuất hiện — dùng để đối chiếu từng trường.
function readVietQrTlv(string $payload): array
{
    $fields = [];
    $offset = 0;
    $length = strlen($payload);

    while ($offset < $length) {
        $id = substr($payload, $offset, 2);
        $len = (int) substr($payload, $offset + 2, 2);
        $value = substr($payload, $offset + 4, $len);
        $fields[] = ['id' => $id, 'value' => $value];
        $offset += 4 + $len;
    }

    return $fields;
}

it('CRC16-CCITT-FALSE của "123456789" là 29B1 (giá trị kiểm chuẩn của thuật toán)', function () {
    expect(Payload::crc16('123456789'))->toBe('29B1');
});

it('dựng đúng cấu trúc EMVCo cho QR tĩnh (không số tiền), đối chiếu từng trường', function () {
    $payload = Payload::build('970436', '0123456789', null, 'GM1024');

    $fields = readVietQrTlv($payload);
    $byId = collect($fields)->pluck('value', 'id');

    expect($byId['00'])->toBe('01') // Payload Format Indicator
        ->and($byId['01'])->toBe('11') // tĩnh: không số tiền
        ->and($byId['53'])->toBe('704') // VND
        ->and($byId['58'])->toBe('VN')
        ->and($byId)->not->toHaveKey('54'); // không có trường số tiền

    // 38 = merchant account info: GUID + sub 01 (BIN + số TK) + sub 02 service code.
    $merchant = readVietQrTlv($byId['38']);
    $merchantById = collect($merchant)->pluck('value', 'id');
    expect($merchantById['00'])->toBe('A000000727')
        ->and($merchantById['02'])->toBe('QRIBFTTA');

    $beneficiary = readVietQrTlv($merchantById['01']);
    $beneficiaryById = collect($beneficiary)->pluck('value', 'id');
    expect($beneficiaryById['00'])->toBe('970436')
        ->and($beneficiaryById['01'])->toBe('0123456789');

    // 62 = additional data, sub 08 = nội dung.
    $additional = readVietQrTlv($byId['62']);
    $additionalById = collect($additional)->pluck('value', 'id');
    expect($additionalById['08'])->toBe('GM1024');

    // 63 = CRC, 4 ký tự hex viết hoa, tính trên toàn chuỗi trừ chính giá trị CRC.
    $withoutCrc = substr($payload, 0, -4);
    expect(substr($payload, -4))->toBe(Payload::crc16($withoutCrc))
        ->and(substr($withoutCrc, -4, 4))->toBe('6304') // id 63, độ dài 04, ngay trước CRC
        ->and(strlen($payload))->toBe(strlen($withoutCrc) + 4);
});

it('QR động (có số tiền) dùng point-of-initiation 12 và mang trường 54', function () {
    $payload = Payload::build('970407', '9988776655', 480000, null);

    $byId = collect(readVietQrTlv($payload))->pluck('value', 'id');

    expect($byId['01'])->toBe('12')
        ->and($byId['54'])->toBe('480000')
        ->and($byId)->not->toHaveKey('62'); // không có nội dung thì không có trường 62
});

it('nội dung chuyển khoản lược dấu, chỉ còn A-Z 0-9 và khoảng trắng, tối đa 25 ký tự', function () {
    expect(Payload::sanitizeMemo('Đơn hàng #GM1024 – Cảm ơn quý khách đã ủng hộ'))
        ->toBe('DON HANG GM1024 CAM ON QU')
        ->and(mb_strlen(Payload::sanitizeMemo('Đơn hàng #GM1024 – Cảm ơn quý khách đã ủng hộ')))->toBeLessThanOrEqual(25);

    expect(Payload::sanitizeMemo(null))->toBe('')
        ->and(Payload::sanitizeMemo(''))->toBe('')
        ->and(Payload::sanitizeMemo('  '))->toBe('');
});

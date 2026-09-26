<?php

namespace App\Support\VietQr;

use Illuminate\Support\Str;

/**
 * Dựng chuỗi EMVCo QR chuẩn VietQR (NAPAS) để quét chuyển khoản nhanh.
 *
 * Cấu trúc TLV (id 2 số + độ dài 2 số + giá trị):
 *   00  Payload Format Indicator = "01"
 *   01  Point of Initiation      = "11" tĩnh (không số tiền) / "12" động (có số tiền)
 *   38  Merchant Account Info    = GUID "A000000727" + sub "01" (BIN + số TK) + sub "02" "QRIBFTTA"
 *   53  Mã tiền tệ               = "704" (VND)
 *   54  Số tiền                  = có khi QR động
 *   58  Mã quốc gia              = "VN"
 *   62  Dữ liệu bổ sung          = sub "08" nội dung chuyển khoản (đã lược dấu, ≤ 25 ký tự)
 *   63  CRC16-CCITT              = 4 ký tự hex viết hoa, tính trên toàn chuỗi kể cả "6304"
 */
final class Payload
{
    private const GUID = 'A000000727';

    private const SERVICE_CODE = 'QRIBFTTA';

    private const MEMO_MAX_LENGTH = 25;

    public static function build(string $bin, string $accountNumber, ?int $amount = null, ?string $memo = null): string
    {
        $merchantAccountInfo =
            self::tlv('00', self::GUID)
            .self::tlv('01', self::tlv('00', $bin).self::tlv('01', $accountNumber))
            .self::tlv('02', self::SERVICE_CODE);

        $sanitizedMemo = self::sanitizeMemo($memo);

        $body =
            self::tlv('00', '01')
            .self::tlv('01', $amount === null ? '11' : '12')
            .self::tlv('38', $merchantAccountInfo)
            .self::tlv('53', '704')
            .($amount === null ? '' : self::tlv('54', (string) $amount))
            .self::tlv('58', 'VN')
            .($sanitizedMemo === '' ? '' : self::tlv('62', self::tlv('08', $sanitizedMemo)))
            .'6304';

        return $body.self::crc16($body);
    }

    // Chỉ giữ A-Z, 0-9 và khoảng trắng — máy đọc mã của ngân hàng không đọc được dấu tiếng Việt.
    public static function sanitizeMemo(?string $memo): string
    {
        if ($memo === null || trim($memo) === '') {
            return '';
        }

        $ascii = Str::ascii($memo);
        $cleaned = strtoupper((string) preg_replace('/[^A-Za-z0-9 ]/', ' ', $ascii));
        $collapsed = trim((string) preg_replace('/\s+/', ' ', $cleaned));

        return substr($collapsed, 0, self::MEMO_MAX_LENGTH);
    }

    // CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, không đảo bit, không XOR ra.
    public static function crc16(string $data): string
    {
        $crc = 0xFFFF;

        for ($i = 0, $length = strlen($data); $i < $length; $i++) {
            $crc ^= (ord($data[$i]) << 8);

            for ($bit = 0; $bit < 8; $bit++) {
                $crc = ($crc & 0x8000) !== 0 ? (($crc << 1) ^ 0x1021) : ($crc << 1);
                $crc &= 0xFFFF;
            }
        }

        return strtoupper(str_pad(dechex($crc), 4, '0', STR_PAD_LEFT));
    }

    private static function tlv(string $id, string $value): string
    {
        return $id.str_pad((string) strlen($value), 2, '0', STR_PAD_LEFT).$value;
    }
}

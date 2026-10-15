<?php

namespace App\Agent\Tools\Runner;

// Tách mọi số tiền (và phần trăm) nhắc trong một đoạn chữ, chuẩn về khoá so được:
// `VND:450000`, `USD:20`, `PCT:15`. "450k", "450.000đ", "1tr2", "1,5 triệu", "2 tỷ",
// "450 nghìn" đều ra `VND:...`. Đoạn đã khớp một mẫu bị xoá trước mẫu sau nên một số
// không bị đếm hai lần.
final class MoneyMentions
{
    // [đơn vị => hệ số], đơn vị dài đứng trước để "triệu" không khớp nhầm "tr".
    private const SCALED_UNITS = [
        'tỷ' => 1_000_000_000, 'tỉ' => 1_000_000_000, 'ty' => 1_000_000_000,
        'triệu' => 1_000_000, 'trieu' => 1_000_000, 'tr' => 1_000_000,
        'nghìn' => 1_000, 'ngàn' => 1_000, 'nghin' => 1_000, 'ngan' => 1_000, 'k' => 1_000,
    ];

    private const NUMBER = '\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?';

    private const VND_SUFFIX = 'đồng|dong|vnđ|vnd|đ|₫';

    // Chữ số ngay sau "tr"/"tỷ" là phần lẻ đọc tắt: "1tr2" = 1,2 triệu, "1tr250" = 1,25 triệu.
    private const TRAILING_DIGITS = '(\d{1,3})(?![\d.,])';

    /** @return list<string> khoá không trùng, giữ thứ tự xuất hiện */
    public static function in(string $text, bool $includeBareNumbers = false): array
    {
        $text = mb_strtolower($text);
        $found = [];
        $units = implode('|', array_map(fn (string $unit) => preg_quote($unit, '/'), array_keys(self::SCALED_UNITS)));
        $number = self::NUMBER;

        $patterns = [
            // 1tr2, 1 triệu 250, 2 tỷ 5
            "/(?<![\\p{L}\\d])({$number})\\s*(tỷ|tỉ|ty|triệu|trieu|tr)\\s*".self::TRAILING_DIGITS.'(?!\s*(?:'.$units.'))/u' => fn (array $m) => 'VND:'.self::scaled($m[1], $m[2], $m[3]),
            // 450k, 1,5 triệu, 450 nghìn (kèm đ/vnd phía sau cũng được)
            "/(?<![\\p{L}\\d])({$number})\\s*({$units})(?!\\p{L})(?:\\s*(?:".self::VND_SUFFIX.'))?/u' => fn (array $m) => 'VND:'.self::scaled($m[1], $m[2]),
            // 450.000đ, 450000 VND
            "/(?<![\\p{L}\\d])({$number})\\s*(?:".self::VND_SUFFIX.')(?!\p{L})/u' => fn (array $m) => 'VND:'.self::plain($m[1]),
            // $20, 20 USD
            "/\\$\\s*({$number})|(?<![\\p{L}\\d])({$number})\\s*(?:usd|us\\$)(?!\\p{L})/u" => fn (array $m) => 'USD:'.self::plain($m[1] !== '' ? $m[1] : $m[2]),
            // 20%, 15,5 %
            '/(?<![\\p{L}\\d])(\\d+(?:[.,]\\d+)?)\\s*%/u' => fn (array $m) => 'PCT:'.self::plain($m[1]),
            // 450.000 không kèm đơn vị: dấu phân cách nghìn đủ để coi là số tiền
            '/(?<![\p{L}\d.,])(\d{1,3}(?:[.,]\d{3})+)(?![\d.,]*\d)/u' => fn (array $m) => 'VND:'.self::plain($m[1]),
        ];

        if ($includeBareNumbers) {
            $patterns['/(?<![\p{L}\d.,])(\d{4,})(?![\d])/u'] = fn (array $m) => 'VND:'.self::plain($m[1]);
        }

        foreach ($patterns as $pattern => $toKey) {
            $text = (string) preg_replace_callback($pattern, function (array $match) use ($toKey, &$found) {
                $found[] = $toKey(array_pad($match, 4, ''));

                return str_repeat(' ', mb_strlen($match[0]));
            }, $text);
        }

        return array_values(array_unique($found));
    }

    private static function scaled(string $number, string $unit, string $trailingDigits = ''): string
    {
        $factor = self::SCALED_UNITS[$unit];
        $value = self::decimal($number) * $factor;

        if ($trailingDigits !== '') {
            $value += (float) ('0.'.$trailingDigits) * $factor;
        }

        return self::canonical($value);
    }

    private static function plain(string $number): string
    {
        return self::canonical(self::decimal($number));
    }

    // "1.250.000" và "1,250,000" là dấu nghìn; "1,5" hay "1.5" là phần thập phân.
    private static function decimal(string $number): float
    {
        if (preg_match('/^\d{1,3}(?:[.,]\d{3})+$/', $number) === 1) {
            return (float) preg_replace('/\D/', '', $number);
        }

        return (float) str_replace(',', '.', $number);
    }

    private static function canonical(float $value): string
    {
        $rounded = round($value, 2);

        return floor($rounded) === $rounded ? (string) (int) $rounded : rtrim(rtrim(number_format($rounded, 2, '.', ''), '0'), '.');
    }
}

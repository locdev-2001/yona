<?php

namespace App\Agent\Tools\Runner;

// Tách mọi số tiền (và phần trăm) nhắc trong một đoạn chữ, chuẩn về khoá so được:
// `VND:450000`, `USD:20`, `PCT:15`. "450k", "450.000đ", "1tr2", "1,5 triệu", "2 tỷ",
// "450 nghìn" đều ra `VND:...`. Đoạn đã khớp một mẫu bị xoá trước mẫu sau nên một số
// không bị đếm hai lần.
//
// Đuôi sau "triệu/tr/tỷ": một chữ số là phần lẻ ("1tr2" = 1.200.000). Hai, ba chữ số là
// cách viết mơ hồ ("1 triệu 50" đọc được 1.050.000 lẫn 1.500.000): trong nguồn thì sinh
// mọi cách đọc, trong câu gửi khách thì trả về ở ambiguous() để rào bắt viết đủ số.
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

    // Dấu chấm, phẩy cuối câu sau đuôi vẫn tính; "1tr 250.000" thì không phải đuôi.
    private const TRAILING_DIGITS = '(\d{1,3})(?!\d|[.,]\d)';

    // Đuôi dài từ chừng này chữ số trở lên thì không còn chắc là phần lẻ.
    private const AMBIGUOUS_TAIL_DIGITS = 2;

    /** @return list<string> khoá số tiền trong câu gửi khách, không trùng, giữ thứ tự xuất hiện */
    public static function in(string $text): array
    {
        return self::scan($text, asSource: false)['amounts'];
    }

    /** @return list<string> khoá số tiền trong dữ liệu nguồn: mọi cách đọc, cả số trần */
    public static function sourced(string $text): array
    {
        return self::scan($text, asSource: true)['amounts'];
    }

    /** @return list<string> cụm viết mơ hồ trong câu gửi khách, đúng như đã viết */
    public static function ambiguous(string $text): array
    {
        return self::scan($text, asSource: false)['ambiguous'];
    }

    /** @return array{amounts: list<string>, ambiguous: list<string>} */
    private static function scan(string $text, bool $asSource): array
    {
        $text = mb_strtolower($text);
        $amounts = [];
        $ambiguous = [];
        $units = implode('|', array_map(fn (string $unit) => preg_quote($unit, '/'), array_keys(self::SCALED_UNITS)));
        $number = self::NUMBER;

        $patterns = [
            // 1tr2, 1 triệu 250, 2 tỷ 5
            "/(?<![\\p{L}\\d])({$number})\\s*(tỷ|tỉ|ty|triệu|trieu|tr)\\s*".self::TRAILING_DIGITS.'(?!\s*(?:'.$units.'))/u' => function (array $m) use ($asSource, &$ambiguous) {
                if (strlen($m[3]) < self::AMBIGUOUS_TAIL_DIGITS) {
                    return [self::scaled($m[1], $m[2], $m[3])];
                }

                if (! $asSource) {
                    $ambiguous[] = trim($m[0]);

                    return [];
                }

                return [self::scaled($m[1], $m[2], $m[3]), self::scaled($m[1], $m[2], $m[3], tailIsDecimal: false)];
            },
            // 450k, 1,5 triệu, 450 nghìn (kèm đ/vnd phía sau cũng được)
            "/(?<![\\p{L}\\d])({$number})\\s*({$units})(?!\\p{L})(?:\\s*(?:".self::VND_SUFFIX.'))?/u' => fn (array $m) => [self::scaled($m[1], $m[2])],
            // 450.000đ, 450000 VND
            "/(?<![\\p{L}\\d])({$number})\\s*(?:".self::VND_SUFFIX.')(?!\p{L})/u' => fn (array $m) => ['VND:'.self::plain($m[1])],
            // $20, 20 USD
            "/\\$\\s*({$number})|(?<![\\p{L}\\d])({$number})\\s*(?:usd|us\\$)(?!\\p{L})/u" => fn (array $m) => ['USD:'.self::plain($m[1] !== '' ? $m[1] : $m[2])],
            // 20%, 15,5 %
            '/(?<![\\p{L}\\d])(\\d+(?:[.,]\\d+)?)\\s*%/u' => fn (array $m) => ['PCT:'.self::plain($m[1])],
            // 450.000 không kèm đơn vị: dấu phân cách nghìn đủ để coi là số tiền
            '/(?<![\p{L}\d.,])(\d{1,3}(?:[.,]\d{3})+)(?![\d.,]*\d)/u' => fn (array $m) => ['VND:'.self::plain($m[1])],
        ];

        if ($asSource) {
            $patterns['/(?<![\p{L}\d.,])(\d{4,})(?![\d])/u'] = fn (array $m) => ['VND:'.self::plain($m[1])];
        }

        foreach ($patterns as $pattern => $toKeys) {
            $text = (string) preg_replace_callback($pattern, function (array $match) use ($toKeys, &$amounts) {
                array_push($amounts, ...$toKeys(array_pad($match, 4, '')));

                return str_repeat(' ', mb_strlen($match[0]));
            }, $text);
        }

        return ['amounts' => array_values(array_unique($amounts)), 'ambiguous' => $ambiguous];
    }

    // Đuôi là phần lẻ ("1tr250" = 1,25 triệu) hoặc đơn vị kế dưới ("1 triệu 50" = 1 triệu 50 nghìn).
    private static function scaled(string $number, string $unit, string $tail = '', bool $tailIsDecimal = true): string
    {
        $factor = self::SCALED_UNITS[$unit];
        $value = self::decimal($number) * $factor;

        if ($tail !== '') {
            $value += $tailIsDecimal ? (float) ('0.'.$tail) * $factor : (int) $tail * ($factor / 1_000);
        }

        return 'VND:'.self::canonical($value);
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

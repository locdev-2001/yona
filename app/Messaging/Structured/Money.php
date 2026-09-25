<?php

namespace App\Messaging\Structured;

/**
 * Tiền trên thẻ: số nguyên theo đơn vị nhỏ nhất của tiền tệ (VND không có xu),
 * không bao giờ lưu chuỗi đã định dạng. Phần trăm giảm do server tính.
 */
final class Money
{
    public const DEFAULT_CURRENCY = 'VND';

    public const MAX_AMOUNT = 100_000_000_000;

    /**
     * Nhận số, chuỗi số (kể cả "450.000đ" của thẻ đời cũ) hoặc
     * `{amount, compare_at?, currency?}`; trả null nếu không có giá.
     *
     * @return array{amount: int, currency: string, compare_at?: int, discount_percent?: int}|null
     *
     * @throws InvalidStructuredPayload
     */
    public static function normalize(mixed $price): ?array
    {
        if ($price === null || $price === '') {
            return null;
        }

        $raw = is_array($price) ? $price : ['amount' => $price];
        $currency = strtoupper(trim((string) ($raw['currency'] ?? self::DEFAULT_CURRENCY)));

        if (preg_match('/^[A-Z]{3}$/', $currency) !== 1) {
            throw InvalidStructuredPayload::because('invalid_price');
        }

        $normalized = ['amount' => self::amount($raw['amount'] ?? null), 'currency' => $currency];
        $compareAt = ($raw['compare_at'] ?? null) === null ? null : self::amount($raw['compare_at']);

        if ($compareAt !== null && $compareAt > $normalized['amount']) {
            $normalized['compare_at'] = $compareAt;
            $normalized['discount_percent'] = (int) round(($compareAt - $normalized['amount']) * 100 / $compareAt);
        }

        return $normalized;
    }

    /** "1.250.000đ" cho VND; tiền tệ khác thêm mã phía sau. */
    public static function format(int $amount, string $currency = self::DEFAULT_CURRENCY): string
    {
        $number = number_format($amount, 0, ',', '.');

        return $currency === self::DEFAULT_CURRENCY ? $number.'đ' : $number.' '.$currency;
    }

    private static function amount(mixed $amount): int
    {
        if (is_string($amount)) {
            // "450000", "450.000", "1,250,000đ" được; "1.5" hay "abc" thì không —
            // dấu phân cách chỉ hợp lệ khi chia đúng từng nhóm 3 chữ số.
            $number = trim((string) preg_replace('/\s*(đ|₫|VND)$/iu', '', trim($amount)));
            $amount = preg_match('/^\d+$|^\d{1,3}([.,\s]\d{3})+$/u', $number) === 1
                ? (int) preg_replace('/\D/', '', $number)
                : null;
        }

        if (! is_int($amount) || $amount < 0 || $amount > self::MAX_AMOUNT) {
            throw InvalidStructuredPayload::because('invalid_price');
        }

        return $amount;
    }
}

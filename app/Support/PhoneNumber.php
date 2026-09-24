<?php

namespace App\Support;

/**
 * Nguồn chuẩn hoá số điện thoại DUY NHẤT: mọi cách gõ của cùng một số phải ra
 * cùng một chuỗi E.164, vì số điện thoại là khoá gộp hồ sơ — lệch một ký tự là
 * một người thành hai hồ sơ.
 *
 * Số không có dấu `+` được hiểu theo quốc gia mặc định (config
 * `yona.phone_numbers`): bỏ tiền tố nội địa (`0912…`), nhận mã nước viết thiếu
 * `+` (`84912…`), và — với đầu vào do người gõ — cả số thiếu tiền tố nội địa
 * (`912…`). Số có `+` (hoặc `00`) giữ nguyên mã nước.
 */
final class PhoneNumber
{
    public const E164_REGEX = '/^\+[1-9]\d{1,14}$/';

    // Số trần dài hơn mọi số nội địa thì là số quốc tế viết thiếu `+`
    // (dòng CSV xuất từ Excel hay mất dấu `+`).
    private const MIN_INTERNATIONAL_DIGITS = 11;

    private const MAX_E164_DIGITS = 15;

    /**
     * @param  bool  $acceptBareNationalNumber  nhận số thiếu tiền tố nội địa (`912…`).
     *                                          Nguồn máy (kênh) tắt đi để không đoán mã nước.
     */
    public static function normalize(?string $input, bool $acceptBareNationalNumber = true): ?string
    {
        $compact = preg_replace('/[\s.\-()\/]+/u', '', (string) $input) ?? '';

        if (preg_match('/^\+?\d+$/', $compact) !== 1) {
            return null;
        }

        if (str_starts_with($compact, '00')) {
            $compact = '+'.substr($compact, 2);
        }

        return str_starts_with($compact, '+')
            ? self::fromInternational(substr($compact, 1))
            : self::fromDigits($compact, $acceptBareNationalNumber);
    }

    private static function fromInternational(string $digits): ?string
    {
        $country = self::defaultCountry();

        if (! str_starts_with($digits, $country['calling_code'])) {
            return self::e164OrNull('+'.$digits);
        }

        return self::fromNationalNumber(substr($digits, strlen($country['calling_code'])));
    }

    private static function fromDigits(string $digits, bool $acceptBareNationalNumber): ?string
    {
        $country = self::defaultCountry();
        $trunkPrefix = $country['trunk_prefix'];

        if ($trunkPrefix !== '' && str_starts_with($digits, $trunkPrefix)) {
            return self::fromNationalNumber(substr($digits, strlen($trunkPrefix)));
        }

        if (str_starts_with($digits, $country['calling_code'])) {
            $withCallingCode = self::fromNationalNumber(substr($digits, strlen($country['calling_code'])));

            if ($withCallingCode !== null) {
                return $withCallingCode;
            }
        }

        if ($acceptBareNationalNumber && ($national = self::fromNationalNumber($digits)) !== null) {
            return $national;
        }

        $length = strlen($digits);

        return $length >= self::MIN_INTERNATIONAL_DIGITS && $length <= self::MAX_E164_DIGITS
            ? self::e164OrNull('+'.$digits)
            : null;
    }

    // Số quốc gia (sau mã nước): tiền tố nội địa lỡ gõ kèm (`+84 0912…`) bị bỏ.
    private static function fromNationalNumber(string $nationalNumber): ?string
    {
        $country = self::defaultCountry();
        $trunkPrefix = $country['trunk_prefix'];

        if ($trunkPrefix !== '' && str_starts_with($nationalNumber, $trunkPrefix)) {
            $nationalNumber = substr($nationalNumber, strlen($trunkPrefix));
        }

        if (! in_array(strlen($nationalNumber), $country['national_number_lengths'], true)) {
            return null;
        }

        return self::e164OrNull('+'.$country['calling_code'].$nationalNumber);
    }

    private static function e164OrNull(string $candidate): ?string
    {
        return preg_match(self::E164_REGEX, $candidate) === 1 ? $candidate : null;
    }

    /** @return array{calling_code: string, trunk_prefix: string, national_number_lengths: list<int>} */
    private static function defaultCountry(): array
    {
        $countries = config('yona.phone_numbers.countries');

        return $countries[config('yona.phone_numbers.default_country')];
    }
}

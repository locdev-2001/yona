<?php

namespace App\Support;

// Port từ app/helpers/email_helper.rb + concern EmailAddressParseable của Chatwoot:
// mọi thao tác trên chuỗi địa chỉ thư (tách, chuẩn hóa, kiểm tra) nằm ở đây,
// không rải Mail::Address ra khắp nơi.
class EmailAddress
{
    // Mail::Address.new(x).address — bỏ phần tên hiển thị, trả về hộp thư.
    public static function parse(?string $value): ?string
    {
        if (blank($value)) {
            return null;
        }

        if (preg_match('/<([^<>]+)>\s*$/', (string) $value, $matches) === 1) {
            return trim($matches[1]);
        }

        return trim((string) $value, " \t\"'");
    }

    // parse_email: chuỗi hỏng thì rơi về địa chỉ gửi mặc định của cài đặt.
    public static function parseOrDefault(?string $value): string
    {
        return self::parse($value) ?? self::defaultSenderAddress();
    }

    public static function defaultSenderAddress(): string
    {
        return (string) self::parse(config('mail.sender_email'));
    }

    // Mail::Address.new(email) với display_name — trả `Name <email>`.
    public static function format(string $address, ?string $displayName): string
    {
        if (blank($displayName)) {
            return $address;
        }

        $needsQuote = preg_match('/[",<>:;@\[\]\\\\]/', $displayName) === 1;
        $name = $needsQuote ? '"'.str_replace(['\\', '"'], ['\\\\', '\\"'], $displayName).'"' : $displayName;

        return $name.' <'.$address.'>';
    }

    // rfc5233: john+test@x.com và john@x.com là cùng một hộp thư.
    public static function normalizeWithPlusAddressing(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $local = explode('+', $local)[0];

        return strtolower($local.'@'.$domain);
    }

    public static function isValid(?string $email): bool
    {
        return filled($email) && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    // Tên hiển thị trong header `From: "Tên" <mail@x>`; không có thì trả null.
    public static function displayName(?string $value): ?string
    {
        if (blank($value) || preg_match('/^(.*)<[^<>]+>\s*$/', (string) $value, $matches) !== 1) {
            return null;
        }

        $name = trim($matches[1]);
        $name = trim($name, '"');

        return $name === '' ? null : $name;
    }
}

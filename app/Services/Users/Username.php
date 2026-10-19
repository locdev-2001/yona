<?php

namespace App\Services\Users;

use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

// Nguồn duy nhất của luật tên người dùng (@username): chuẩn hoá, kiểm hợp lệ,
// gợi ý từ email/tên. Lưu luôn ở dạng chữ thường nên so trùng chỉ cần so bằng.
final class Username
{
    public const MIN_LENGTH = 3;

    public const MAX_LENGTH = 30;

    // Chữ thường, số, dấu chấm, gạch dưới; không mở đầu/kết thúc bằng dấu chấm,
    // không hai dấu chấm liền nhau.
    public const PATTERN = '/^(?!\.)(?!.*\.\.)[a-z0-9._]+(?<!\.)$/';

    private const RESERVED = [
        'admin', 'administrator', 'api', 'app', 'chat', 'help', 'me', 'mod', 'moderator',
        'null', 'root', 'settings', 'support', 'system', 'undefined', 'yona',
    ];

    public static function normalize(?string $username): string
    {
        return mb_strtolower(ltrim(trim((string) $username), '@'));
    }

    /** @return list<mixed> */
    public static function rules(?User $owner = null): array
    {
        return [
            'required',
            'string',
            'min:'.self::MIN_LENGTH,
            'max:'.self::MAX_LENGTH,
            'regex:'.self::PATTERN,
            Rule::notIn(self::RESERVED),
            Rule::unique('users', 'username')->ignore($owner?->getKey()),
        ];
    }

    /** @return array<string, string> */
    public static function messages(string $field = 'username'): array
    {
        return [
            "{$field}.required" => __('people.USERNAME.REQUIRED'),
            "{$field}.min" => __('people.USERNAME.INVALID'),
            "{$field}.max" => __('people.USERNAME.INVALID'),
            "{$field}.regex" => __('people.USERNAME.INVALID'),
            "{$field}.not_in" => __('people.USERNAME.RESERVED'),
            "{$field}.unique" => __('people.USERNAME.TAKEN'),
        ];
    }

    public static function isAvailable(string $username, ?User $owner = null): bool
    {
        $username = self::normalize($username);

        return validator(['username' => $username], ['username' => self::rules($owner)])->passes();
    }

    // Gợi ý từ phần trước @ của email (hoặc tên), bỏ dấu, thêm số nếu đã có người dùng.
    public static function suggest(string $seed, ?User $owner = null): string
    {
        $base = Str::of(Str::ascii(Str::before($seed, '@')))
            ->lower()
            ->replaceMatches('/[^a-z0-9._]+/', '')
            ->replaceMatches('/\.{2,}/', '.')
            ->trim('.')
            ->limit(self::MAX_LENGTH - 4, '')
            ->toString();

        if (mb_strlen($base) < self::MIN_LENGTH) {
            $base = 'user'.$base;
        }

        $candidate = $base;
        for ($suffix = 1; ! self::isAvailable($candidate, $owner) && $suffix < 1000; $suffix++) {
            $candidate = $base.$suffix;
        }

        return $candidate;
    }
}

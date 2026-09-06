<?php

namespace App\Services\HelpCenter;

use Illuminate\Support\Str;

// Người dùng cuối không điền slug (lệnh founder): tên tự do — kể cả tiếng Việt
// có dấu — được chuyển thành slug ASCII, và hậu tố -2, -3… giữ tính duy nhất
// trong phạm vi mà người gọi định nghĩa qua $taken.
final class SlugGenerator
{
    private const FALLBACK = 'untitled';

    public static function slugify(?string $value): string
    {
        $slug = Str::slug((string) $value);

        return $slug === '' ? self::FALLBACK : $slug;
    }

    /**
     * @param  callable(string): bool  $taken  slug đã có người dùng chưa
     * @param  list<string>  $reserved  slug không được phép chiếm
     */
    public static function unique(?string $value, callable $taken, array $reserved = []): string
    {
        $base = self::slugify($value);
        $candidate = $base;
        $suffix = 1;

        while (in_array($candidate, $reserved, true) || $taken($candidate)) {
            $suffix++;
            $candidate = $base.'-'.$suffix;
        }

        return $candidate;
    }
}

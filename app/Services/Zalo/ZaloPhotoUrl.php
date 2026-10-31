<?php

namespace App\Services\Zalo;

/**
 * Ảnh Zalo trên CDN `*.zdn.vn` có hai bản: `/jpg/…/<id>.jpg` và bản gốc JPEG XL
 * `/jxl/…/<id>.jxl`. Từ 28/10/2026 bản jpg của ảnh gửi từ điện thoại trả 500 trong
 * khi bản jxl vẫn tải được, nên bản jxl là URL thay thế khi tải ảnh.
 */
final class ZaloPhotoUrl
{
    private const JPEG_XL_URL_PATTERN = '~^(https://[a-z0-9.-]+\.zdn\.vn/(?:[a-z]+/)?)jpg(/.+)\.jpg$~i';

    /** @return list<string> */
    public static function alternativesFor(string $url): array
    {
        return preg_match(self::JPEG_XL_URL_PATTERN, $url, $parts) === 1
            ? ["{$parts[1]}jxl{$parts[2]}.jxl"]
            : [];
    }
}

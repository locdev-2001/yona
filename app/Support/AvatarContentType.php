<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Nguồn duy nhất quyết định "ảnh nào dùng làm avatar được" và tên MIME chuẩn của nó.
 * Tách khỏi model vì cả job tải avatar theo URL lẫn đường upload đều cần chung luật này.
 */
final class AvatarContentType
{
    /** @var list<string> Đúng danh sách ALLOWED_AVATAR_CONTENT_TYPES của Avatarable bản gốc. */
    public const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    /**
     * Tên MIME không chuẩn mà CDN thật hay trả về, quy về tên chuẩn.
     * CDN avatar Zalo (s*-ava-talk.zadn.vn) trả `image/jpg`.
     *
     * @var array<string, string>
     */
    private const ALIASES = [
        'image/jpg' => 'image/jpeg',
        'image/pjpeg' => 'image/jpeg',
        'image/x-png' => 'image/png',
    ];

    /**
     * Kiểu ảnh thật của nội dung tải về, hoặc null nếu không dùng làm avatar được.
     *
     * Header chỉ dùng để chặn sớm những thứ hiển nhiên không phải ảnh; kiểu ghi vào
     * DB luôn lấy từ chính nội dung (finfo), nên máy chủ lạ không thể khai gian
     * `image/png` để nhét tệp khác vào kho.
     */
    public static function resolve(?string $declaredContentType, string $contents): ?string
    {
        $declared = self::normalize($declaredContentType);

        if ($declared !== null && ! str_starts_with($declared, 'image/')) {
            return null;
        }

        $sniffed = self::normalize((new \finfo(FILEINFO_MIME_TYPE))->buffer($contents) ?: null);

        return $sniffed !== null && in_array($sniffed, self::ALLOWED, true) ? $sniffed : null;
    }

    // Bỏ tham số charset, hạ chữ thường, quy tên lạ về tên chuẩn — tương đương
    // normalized_content_type của refs/chatwoot/lib/safe_fetch/fetcher.rb.
    private static function normalize(?string $value): ?string
    {
        $mime = mb_strtolower(trim(Str::before((string) $value, ';')));

        return $mime === '' ? null : (self::ALIASES[$mime] ?? $mime);
    }
}

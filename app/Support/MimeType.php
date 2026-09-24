<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Nguồn duy nhất chuẩn hoá và nhận dạng kiểu MIME của tệp máy chủ tự tải về.
 * Chuẩn hoá content type khai báo, cộng bước đoán kiểu từ chính nội dung (gem `marcel` mà ActiveStorage dùng).
 */
final class MimeType
{
    public const OCTET_STREAM = 'application/octet-stream';

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

    // Bỏ tham số charset, hạ chữ thường, quy tên lạ về tên chuẩn.
    public static function normalize(?string $value): ?string
    {
        $mime = mb_strtolower(trim(Str::before((string) $value, ';')));

        return $mime === '' ? null : (self::ALIASES[$mime] ?? $mime);
    }

    public static function sniffContents(string $contents): ?string
    {
        return self::normalize((new \finfo(FILEINFO_MIME_TYPE))->buffer($contents) ?: null);
    }

    public static function sniffFile(string $path): ?string
    {
        return self::normalize((new \finfo(FILEINFO_MIME_TYPE))->file($path) ?: null);
    }

    /**
     * Kiểu ghi vào kho cho một tệp đã tải về.
     *
     * Máy chủ ngoài khai kiểu gì cũng không đổi được họ MIME thật của nội dung:
     * khai `image/png` mà bytes là HTML thì lưu `text/html`, nên `file_type` và
     * cách trình duyệt mở tệp bám theo nội dung chứ không theo lời khai. Chỉ khi
     * hai bên cùng họ (`application/pdf` vs `application/pdf`, `image/*` vs
     * `image/*`) mới giữ lời khai — nó thường chi tiết hơn kết quả đoán
     * (`application/vnd.openxmlformats-…` bị finfo đoán thành `application/zip`).
     */
    public static function resolveForFile(?string $declaredContentType, string $path): string
    {
        return self::pick(self::normalize($declaredContentType), self::sniffFile($path));
    }

    private static function pick(?string $declared, ?string $sniffed): string
    {
        if ($sniffed === null || $sniffed === self::OCTET_STREAM) {
            return $declared ?? self::OCTET_STREAM;
        }

        if ($declared === null || $declared === self::OCTET_STREAM) {
            return $sniffed;
        }

        return self::family($declared) === self::family($sniffed) ? $declared : $sniffed;
    }

    private static function family(string $mime): string
    {
        return Str::before($mime, '/');
    }
}

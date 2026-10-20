<?php

namespace App\Support;

/**
 * Nguồn duy nhất quyết định "ảnh nào dùng làm avatar được" và tên MIME chuẩn của nó.
 * Tách khỏi model vì cả job tải avatar theo URL lẫn đường upload đều cần chung luật này.
 * Việc chuẩn hoá/đoán tên MIME dùng chung `MimeType` với đường tải đính kèm.
 */
final class AvatarContentType
{
    /** @var list<string> Đúng danh sách ALLOWED_AVATAR_CONTENT_TYPES của Avatarable bản gốc. */
    public const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    public const UPLOAD_MAX_KILOBYTES = 15360;

    /**
     * Kiểu ảnh thật của nội dung tải về, hoặc null nếu không dùng làm avatar được.
     *
     * Header chỉ dùng để chặn sớm những thứ hiển nhiên không phải ảnh; kiểu ghi vào
     * DB luôn lấy từ chính nội dung (finfo), nên máy chủ lạ không thể khai gian
     * `image/png` để nhét tệp khác vào kho.
     */
    public static function resolve(?string $declaredContentType, string $contents): ?string
    {
        $declared = MimeType::normalize($declaredContentType);

        if ($declared !== null && ! str_starts_with($declared, 'image/')) {
            return null;
        }

        $sniffed = MimeType::sniffContents($contents);

        return $sniffed !== null && in_array($sniffed, self::ALLOWED, true) ? $sniffed : null;
    }
}

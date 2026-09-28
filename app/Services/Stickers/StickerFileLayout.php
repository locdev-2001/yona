<?php

namespace App\Services\Stickers;

use App\Models\Sticker;

// Nơi duy nhất đặt tên tệp kho sticker trên disk `stickers`: mọi tệp của một
// sticker nằm chung thư mục {hash[0:2]}/{hash}, hash là content_hash (ảnh gốc +
// thông số chỉnh), nên sticker trùng nội dung ở các bộ khác nhau dùng chung tệp.
// Tên tệp dựng mang cạnh ảnh: tệp được CDN cache vĩnh viễn, đổi cỡ phải ra URL mới
// chứ không ghi đè lên URL đang cache.
final class StickerFileLayout
{
    private const IMAGE_FILE_PATTERN = 'sticker-%d.webp';

    private const STATIC_FILE_PATTERN = 'static-%d.png';

    private const ORIGINAL_BASENAME = 'original';

    public static function directory(string $contentHash): string
    {
        return substr($contentHash, 0, 2).'/'.$contentHash;
    }

    /**
     * Tệp trình dựng ghi ra ở cỡ đang cấu hình, cũng là các tệp tin gửi đi mượn làm
     * đính kèm. Tin cũ có thể còn mượn tệp cỡ trước trong cùng thư mục.
     *
     * @return array{image_path: string, static_path: string}
     */
    public static function renderedPaths(string $contentHash): array
    {
        $directory = self::directory($contentHash);

        return [
            'image_path' => "{$directory}/".sprintf(self::IMAGE_FILE_PATTERN, Sticker::imageSize()),
            'static_path' => "{$directory}/".sprintf(self::STATIC_FILE_PATTERN, Sticker::outboundImageSize()),
        ];
    }

    public static function originalPath(string $contentHash, string $extension): string
    {
        return self::directory($contentHash).'/'.self::ORIGINAL_BASENAME.'.'.$extension;
    }
}

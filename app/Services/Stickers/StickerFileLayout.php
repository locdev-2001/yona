<?php

namespace App\Services\Stickers;

// Nơi duy nhất đặt tên tệp kho sticker trên disk `stickers`: mọi tệp của một
// sticker nằm chung thư mục {hash[0:2]}/{hash}, hash là content_hash (ảnh gốc +
// thông số chỉnh), nên sticker trùng nội dung ở các bộ khác nhau dùng chung tệp.
final class StickerFileLayout
{
    private const IMAGE_FILE = 'sticker.webp';

    private const STATIC_FILE = 'static.png';

    private const ORIGINAL_BASENAME = 'original';

    public static function directory(string $contentHash): string
    {
        return substr($contentHash, 0, 2).'/'.$contentHash;
    }

    /**
     * Tệp trình dựng ghi ra, cũng là các tệp tin đã gửi có thể mượn làm đính kèm.
     *
     * @return array{image_path: string, static_path: string}
     */
    public static function renderedPaths(string $contentHash): array
    {
        $directory = self::directory($contentHash);

        return [
            'image_path' => "{$directory}/".self::IMAGE_FILE,
            'static_path' => "{$directory}/".self::STATIC_FILE,
        ];
    }

    public static function originalPath(string $contentHash, string $extension): string
    {
        return self::directory($contentHash).'/'.self::ORIGINAL_BASENAME.'.'.$extension;
    }
}

<?php

namespace App\Support;

use Imagick;
use ImagickException;

/**
 * Dựng ảnh thu nhỏ WebP cho một ảnh. Nguồn duy nhất của luật thu nhỏ: cạnh dài,
 * chất lượng, ảnh nào bỏ qua. Đọc ảnh một lần nên trả luôn kích thước đã xoay
 * theo EXIF, để nơi gọi bù `meta.width/height` cho ảnh chưa có.
 */
class ThumbnailGenerator
{
    public const LONG_EDGE = 240;

    private const QUALITY = 75;

    // Ảnh nguồn lớn hơn (hoặc GIF động nhiều khung) thì không giải mã cả ảnh, tránh worker hết RAM.
    private const MAX_SOURCE_PIXELS = 40_000_000;

    /**
     * Null khi không đọc được ảnh. `thumbnail` null khi ảnh không cần thu nhỏ (đã
     * nhỏ, GIF động) hoặc quá lớn để giải mã an toàn.
     *
     * @return array{width: int, height: int, thumbnail: string|null}|null
     */
    public function generate(string $imageBytes): ?array
    {
        try {
            $probe = new Imagick;
            $probe->pingImageBlob($imageBytes);
            $sourceWidth = $probe->getImageWidth();
            $sourceHeight = $probe->getImageHeight();
            $isAnimated = $probe->getNumberImages() > 1;
            $probe->clear();

            if ($isAnimated || $sourceWidth * $sourceHeight > self::MAX_SOURCE_PIXELS) {
                return ['width' => $sourceWidth, 'height' => $sourceHeight, 'thumbnail' => null];
            }

            $image = new Imagick;
            $image->readImageBlob($imageBytes);
            $image->autoOrient();
            $width = $image->getImageWidth();
            $height = $image->getImageHeight();

            if (max($width, $height) <= self::LONG_EDGE) {
                $image->clear();

                return ['width' => $width, 'height' => $height, 'thumbnail' => null];
            }

            $image->thumbnailImage(self::LONG_EDGE, self::LONG_EDGE, true);
            $image->stripImage();
            $image->setImageFormat('webp');
            $image->setImageCompressionQuality(self::QUALITY);
            $thumbnail = $image->getImageBlob();
            $image->clear();

            return ['width' => $width, 'height' => $height, 'thumbnail' => $thumbnail];
        } catch (ImagickException) {
            return null;
        }
    }
}

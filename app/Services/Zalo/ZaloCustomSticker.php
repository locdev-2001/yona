<?php

namespace App\Services\Zalo;

/**
 * Sticker tự tạo của Zalo (kể cả sticker kho Yona gửi đi) về tới máy nhận dưới
 * dạng ẢNH: `msgType = chat.photo`, dấu hiệu duy nhất là `pStickerType` trong
 * chuỗi JSON `content.params`. Nhận diện ở đây để driver lưu đúng contract
 * sticker của lõi; lệnh sửa dữ liệu cũ dùng chung đúng luật này.
 *
 * Payload ghi vào `content_attributes.sticker` mang khoá `source` riêng nên danh
 * mục sticker gốc của Zalo lẫn kho Yona đều không nhận là của mình: tin này
 * hiển thị như sticker nhưng không gửi lại được qua bảng chọn.
 */
final class ZaloCustomSticker
{
    public const SOURCE = 'zalo_custom';

    private const PHOTO_MSG_TYPE = 'chat.photo';

    private const STICKER_TYPE_KEY = 'pStickerType';

    private function __construct(
        public readonly ?string $contentId,
        public readonly ?string $webpUrl,
        public readonly ?string $imageUrl,
        public readonly ?int $width,
        public readonly ?int $height,
    ) {}

    /**
     * @param  mixed  $zcaMessage  tin thô của zca (`listener_data`) hoặc ảnh chụp `content_attributes.zca_message`
     */
    public static function fromZcaMessage(mixed $zcaMessage): ?self
    {
        if (! is_array($zcaMessage) || ($zcaMessage['msgType'] ?? null) !== self::PHOTO_MSG_TYPE) {
            return null;
        }

        $content = is_array($zcaMessage['content'] ?? null) ? $zcaMessage['content'] : [];
        $params = InboundCardParser::decodeJson($content['params'] ?? null) ?? [];
        $stickerType = $params[self::STICKER_TYPE_KEY] ?? null;

        if (! is_numeric($stickerType) || (int) $stickerType <= 0) {
            return null;
        }

        $webp = is_array($params['webp'] ?? null) ? $params['webp'] : [];

        return new self(
            contentId: self::filledString($params['contentId'] ?? null),
            webpUrl: self::httpUrl($webp['url'] ?? null),
            imageUrl: self::httpUrl($params['hd'] ?? null) ?? self::httpUrl($content['href'] ?? null),
            width: self::positiveInt($webp['width'] ?? $params['width'] ?? null),
            height: self::positiveInt($webp['height'] ?? $params['height'] ?? null),
        );
    }

    /** Ảnh hiển thị: bản WebP (sticker kho Yona) trước, rồi ảnh JPG của Zalo. */
    public function displayUrl(): ?string
    {
        return $this->webpUrl ?? $this->imageUrl;
    }

    /** @return array<string, mixed> */
    public function payload(): array
    {
        return array_filter([
            'source' => self::SOURCE,
            'id' => $this->contentId,
            'url' => $this->displayUrl(),
            'width' => $this->width,
            'height' => $this->height,
        ], fn ($value) => $value !== null);
    }

    private static function filledString(mixed $value): ?string
    {
        return is_scalar($value) && trim((string) $value) !== '' ? trim((string) $value) : null;
    }

    private static function httpUrl(mixed $value): ?string
    {
        $url = self::filledString($value);

        return $url !== null && preg_match('#^https?://#i', $url) ? $url : null;
    }

    private static function positiveInt(mixed $value): ?int
    {
        return is_numeric($value) && (int) $value > 0 ? (int) $value : null;
    }
}

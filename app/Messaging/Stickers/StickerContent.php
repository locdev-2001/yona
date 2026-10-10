<?php

namespace App\Messaging\Stickers;

/**
 * Một sticker theo cách lõi hiểu, không phụ thuộc kênh. Driver kênh chỉ bóc payload
 * của mình ra giá trị này; mọi thứ về hình dạng tin sticker nằm ở StickerMessage.
 *
 * `payload()` là thứ được ghi vào `content_attributes.sticker`: khoá chuẩn (`id`,
 * `pack_id`, `url`, `animated`, `emoji`) đè lên `extra` — dữ liệu riêng của
 * kênh/danh mục giữ nguyên để danh mục nhận lại được khi gửi lại sticker.
 */
final class StickerContent
{
    /**
     * @param  string|int  $id  mã sticker của kênh (Zalo dùng số)
     * @param  string|null  $imageUrl  URL ảnh công khai và không hết hạn, dùng làm `external_url`;
     *                                 null khi kênh phải tự tải ảnh về (URL có token/hết hạn)
     * @param  array<string, mixed>  $extra
     */
    public function __construct(
        public readonly string|int $id,
        public readonly ?string $imageUrl = null,
        public readonly string|int|null $packId = null,
        public readonly ?bool $animated = null,
        public readonly ?string $emoji = null,
        public readonly array $extra = [],
    ) {}

    /**
     * Dựng lại từ payload một danh mục đã sinh (kho Yona, sticker đã lưu): payload giữ nguyên.
     *
     * @param  array<string, mixed>  $payload
     */
    public static function fromPayload(array $payload): self
    {
        return new self(
            id: $payload['id'] ?? throw new \InvalidArgumentException('Payload sticker thiếu id.'),
            imageUrl: isset($payload['url']) && is_string($payload['url']) ? $payload['url'] : null,
            packId: $payload['pack_id'] ?? null,
            animated: isset($payload['animated']) ? (bool) $payload['animated'] : null,
            emoji: $payload['emoji'] ?? null,
            extra: $payload,
        );
    }

    /** @return array<string, mixed> */
    public function payload(): array
    {
        $canonical = array_filter([
            'id' => $this->id,
            'pack_id' => $this->packId,
            'url' => $this->imageUrl,
            'animated' => $this->animated,
            'emoji' => $this->emoji,
        ], fn ($value) => $value !== null);

        return [...$this->extra, ...$canonical];
    }
}

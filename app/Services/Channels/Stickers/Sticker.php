<?php

namespace App\Services\Channels\Stickers;

/**
 * Một sticker theo contract trung tính của lõi. `id` là chuỗi mờ do driver tự
 * định nghĩa (Zalo dùng mã số); `payload` là dữ liệu riêng của driver, được ghi
 * vào `content_attributes.sticker` để lượt gửi dùng lại — không bao giờ lộ ra API.
 * `keywords` là từ khoá gợi ý khi gõ; danh mục không có thì để rỗng.
 */
final class Sticker
{
    /**
     * @param  array<string, mixed>  $payload
     * @param  list<string>  $keywords
     */
    public function __construct(
        public readonly string $id,
        public readonly string $imageUrl,
        public readonly ?string $packId,
        public readonly ?string $label,
        public readonly array $payload,
        public readonly array $keywords = [],
    ) {}

    /** @return array{id: string, image_url: string, pack_id: string|null, label: string|null} */
    public function toApi(): array
    {
        return [
            'id' => $this->id,
            'image_url' => $this->imageUrl,
            'pack_id' => $this->packId,
            'label' => $this->label,
        ];
    }
}

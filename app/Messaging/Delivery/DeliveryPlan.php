<?php

namespace App\Messaging\Delivery;

/**
 * Kết quả của `DeliveryPlanner`: mức đã chọn cho một tin + các phần cần gửi
 * theo thứ tự. Ở mức `native`, mỗi phần là payload thô của kênh (SendOn*Service
 * chỉ việc bọc recipient/tag rồi gửi). Ở mức `text`/`text_numbered`, luôn đúng
 * một phần dạng `['text' => string]`.
 */
final readonly class DeliveryPlan
{
    /** @param list<array<string, mixed>> $parts */
    private function __construct(
        public DeliveryLevel $level,
        public array $parts,
    ) {}

    /** @param list<array<string, mixed>> $parts */
    public static function native(array $parts): self
    {
        return new self(DeliveryLevel::Native, $parts);
    }

    public static function text(string $text): self
    {
        return new self(DeliveryLevel::Text, [['text' => $text]]);
    }

    public static function textNumbered(string $text): self
    {
        return new self(DeliveryLevel::TextNumbered, [['text' => $text]]);
    }

    /** Ảnh thẻ (satori) kèm chữ đi cùng — `$imageUrl` là URL công khai trên disk `attachments`. */
    public static function imageText(string $text, string $imageUrl): self
    {
        return new self(DeliveryLevel::ImageText, [['text' => $text, 'image_url' => $imageUrl]]);
    }

    /** Chữ thuần của mức `text`/`text_numbered`/`image_text`; null ở mức `native`. */
    public function plainText(): ?string
    {
        return $this->level === DeliveryLevel::Native ? null : ($this->parts[0]['text'] ?? null);
    }

    /** URL ảnh thẻ của mức `image_text`; null ở mọi mức khác. */
    public function imageUrl(): ?string
    {
        return $this->level === DeliveryLevel::ImageText ? ($this->parts[0]['image_url'] ?? null) : null;
    }
}

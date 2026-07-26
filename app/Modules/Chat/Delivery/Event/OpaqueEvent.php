<?php

namespace App\Modules\Chat\Delivery\Event;

/**
 * Sự kiện ta chưa biết đọc — giữ nguyên si, không vứt.
 *
 * Lý do tồn tại: widget đã nhúng vào website khách sẽ KHÔNG cập nhật cùng nhịp
 * với máy chủ. Khi ta thêm loại sự kiện mới, bản widget cũ gặp nó phải bỏ qua êm
 * chứ không vỡ giao diện; và tin cũ phải đọc lại được sau khi ta đổi bộ sự kiện.
 *
 * Vứt sự kiện lạ là mất dữ liệu vĩnh viễn — không có đường khôi phục.
 */
final class OpaqueEvent extends OutboundEvent
{
    /** @param array<string, mixed> $raw */
    public function __construct(public readonly array $raw) {}

    public function type(): OutboundEventType
    {
        return OutboundEventType::Opaque;
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return $this->raw;
    }

    public function plainText(): string
    {
        return '';
    }
}

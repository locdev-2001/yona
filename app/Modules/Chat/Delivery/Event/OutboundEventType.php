<?php

namespace App\Modules\Chat\Delivery\Event;

/**
 * DANH TÍNH của một sự kiện nội dung của tin — chuỗi ổn định, lưu DB và đưa lên API.
 *
 * Đi cặp với `OutboundEvent` (payload) theo luật đối xứng §0.6, cùng khuôn
 * `InboundEvent`↔`InboundEventType` và `OutboundEvent`↔`OutboundEventType`.
 *
 * Tên class KHÔNG phải định dạng lưu trữ: đổi tên `CardEvent` thoải mái, nhưng
 * đổi chuỗi `'card'` ở đây là phá vỡ mọi hàng đã lưu và mọi client đã tích hợp.
 */
enum OutboundEventType: string
{
    case Text = 'text';
    case Media = 'media';
    case Card = 'card';
    case Actions = 'actions';
    case Input = 'input';

    /** Sự kiện ta chưa biết — giữ nguyên để không mất dữ liệu, không phải loại thật. */
    case Opaque = 'opaque';
}

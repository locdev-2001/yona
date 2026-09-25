<?php

namespace App\Messaging\Delivery;

/** Mức hạ cấp khi gửi tin có cấu trúc ra một kênh (docs/system-architecture.md §3). */
enum DeliveryLevel: string
{
    /** Payload gốc của kênh (chip, nút, carousel…). */
    case Native = 'native';

    /** Chữ thuần kèm danh sách đánh số cho lựa chọn. */
    case TextNumbered = 'text_numbered';

    /** Chữ thuần, không có lựa chọn để trả lời lại. */
    case Text = 'text';
}

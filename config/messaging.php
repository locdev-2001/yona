<?php

use App\Messaging\Structured\Types\BankTransferType;

return [
    /*
    | Các loại tin có cấu trúc. Thêm loại mới: một class hiện thực
    | App\Messaging\Structured\StructuredType + một dòng ở đây (+ tên trong
    | Message::CONTENT_TYPES nếu là loại mới hẳn). Không sửa lõi.
    */
    'structured_types' => [
        BankTransferType::class,
    ],

    /*
    | Renderer gốc theo kênh cho DeliveryPlanner (App\Messaging\Delivery). Khoá
    | bằng class kênh: dù nhiều kênh cùng khai một capability (vd
    | outbound_quick_reply), mỗi kênh vẫn có payload riêng. Thêm kênh mới có
    | payload gốc: một class hiện thực NativeRenderer + một dòng ở đây.
    */
    'delivery_renderers' => [],

    /*
    | Biểu cảm khách được thả trên widget, đúng thứ tự thanh chọn. Máy chủ chỉ
    | nhận emoji trong danh sách này; widget đọc qua cấu hình kênh.
    */
    'widget_reactions' => ['👍', '❤️', '😆', '😮', '😢', '🙏'],
];

<?php

// Tin nhắn có cấu trúc (app/Messaging/Structured): lỗi payload, chữ hạ cấp cho kênh không hiển thị được thẻ.

return [
    'errors' => [
        'not_allowed' => 'Loại tin :type không gửi được theo chiều này.',
        'not_answerable' => 'Tin :type không nhận câu trả lời.',
        'unknown_choice' => 'Lựa chọn không có trong tin.',
        'already_submitted' => 'Tin này đã được trả lời.',
        'duplicate_choice' => 'Các lựa chọn phải khác nhau.',
        'duplicate_item' => 'Mã thẻ bị trùng.',
        'invalid_action' => 'Nút không hợp lệ.',
        'invalid_url' => 'Đường dẫn phải bắt đầu bằng http:// hoặc https://.',
        'invalid_phone' => 'Số điện thoại không hợp lệ.',
        'invalid_price' => 'Giá không hợp lệ.',
        'variants_without_order' => 'Thẻ có biến thể phải có nút Đặt mua.',
        'unknown_item' => 'Không tìm thấy sản phẩm để đặt.',
        'invalid_selection' => 'Lựa chọn :name không hợp lệ hoặc đã hết.',
        'quantity_exceeded' => 'Số lượng vượt quá mức cho phép.',
        'field_required' => 'Cần điền :field.',
        'field_invalid' => ':field không hợp lệ.',
        'empty_submission' => 'Chưa có thông tin nào được gửi.',
        'payload_too_large' => 'Dữ liệu kèm trang quá lớn.',
    ],
    'cards' => [
        'preview_many' => ':title và :count sản phẩm khác',
        'compare_at' => 'giá cũ :price, -:percent%',
    ],
    'order_status' => [
        'preview' => 'Đơn #:ref · :status',
        'eta' => 'Dự kiến nhận :date',
        'total' => 'Tổng :amount',
        'tracking' => 'Theo dõi: :url',
        'statuses' => [
            'placed' => 'Đã đặt',
            'confirmed' => 'Đã xác nhận',
            'shipped' => 'Đã gửi',
            'delivering' => 'Đang giao',
            'delivered' => 'Đã nhận',
            'cancelled' => 'Đã huỷ',
        ],
    ],
    'order_request' => [
        'preview' => 'Yêu cầu đặt hàng: :title',
        'line' => 'Yêu cầu đặt hàng: :title:selection × :quantity',
        'note' => 'Ghi chú: :note',
    ],
];

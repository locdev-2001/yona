<?php

// Trang công khai theo token (`/m/{token}`, phase-05 §C): chọn lịch, điền form,
// theo dõi đơn, chuyển khoản, chi tiết sản phẩm — không đăng nhập.

return [
    'not_found' => 'Liên kết không hợp lệ hoặc đã hết hạn.',
    'loading' => 'Đang tải…',
    'send_failed' => 'Chưa gửi được, thử lại nhé.',
    'submitted_title' => 'Đã ghi nhận',
    'submitted_body' => 'Cảm ơn bạn, shop đã nhận được thông tin.',
    'close' => 'Đóng',
    'you_can_close_tab' => 'Bạn có thể đóng trang này.',
    'open_in_new_tab' => 'Mở trong tab mới',

    'schedule' => [
        'day_section' => 'Ngày',
        'time_section' => 'Khung giờ',
        'full_note' => 'Khung gạch ngang đã hết chỗ.',
        'no_slots' => 'Hiện chưa có khung giờ nào trống.',
        'confirm' => 'Xác nhận {day}, {time}',
        'choose_slot' => 'Chọn một khung giờ',
    ],

    'form' => [
        'submit' => 'Gửi thông tin',
        'check_field' => 'Kiểm tra lại {field}',
    ],

    'order_tracking' => [
        'ref' => 'Đơn #{ref}',
        'eta' => 'Dự kiến nhận {date}',
        'fee_included' => 'Đã gồm phí giao',
        'total' => 'Tổng tiền',
        'track_order' => 'Theo dõi trên website',
        'statuses' => [
            'placed' => 'Đã đặt',
            'confirmed' => 'Đã xác nhận',
            'shipped' => 'Đã gửi hàng',
            'delivering' => 'Đang giao',
            'delivered' => 'Đã nhận hàng',
            'cancelled' => 'Đã huỷ',
        ],
    ],

    'bank_transfer' => [
        'copy' => 'Chép',
        'copied' => 'Đã chép',
        'bank_name' => 'Ngân hàng',
        'account_number' => 'Số tài khoản',
        'account_name' => 'Chủ tài khoản',
        'amount' => 'Số tiền',
        'transfer_note' => 'Nội dung chuyển khoản',
        'instructions' => 'Hướng dẫn',
    ],

    'product' => [
        'variant' => 'Phân loại',
        'quantity' => 'Số lượng',
        'max_quantity' => 'Tối đa {max}',
        'note_label' => 'Ghi chú cho shop',
        'note_placeholder' => 'Không bắt buộc',
        'subtotal' => 'Tạm tính',
        'submit' => 'Gửi yêu cầu đặt hàng',
        'select_variant' => 'Chọn đủ phân loại trước khi đặt',
    ],
];

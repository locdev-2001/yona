<?php

// Tin nhắn có cấu trúc (app/Messaging/Structured): lỗi payload, chữ hạ cấp cho kênh không hiển thị được thẻ.

return [
    'errors' => [
        'not_allowed' => 'Loại tin :type không gửi được theo chiều này.',
        'not_answerable' => 'Tin :type không nhận câu trả lời.',
        'unknown_choice' => 'Lựa chọn không có trong tin.',
        'already_submitted' => 'Tin này đã được trả lời.',
        'invalid_action' => 'Nút không hợp lệ.',
        'invalid_url' => 'Đường dẫn phải bắt đầu bằng http:// hoặc https://.',
        'invalid_phone' => 'Số điện thoại không hợp lệ.',
        'invalid_price' => 'Giá không hợp lệ.',
        'unknown_payment_account' => 'Không tìm thấy tài khoản nhận tiền.',
        'payment_account_not_allowed' => 'Bạn không được gửi thẻ chuyển khoản bằng tài khoản này.',
        'duplicate_payment_account' => 'Ngân hàng và số tài khoản này đã được thêm.',
    ],
    'settings' => [
        'invalid_channel' => 'Kênh khác không hợp lệ: kiểm tra loại kênh và đường dẫn hoặc số điện thoại.',
        'invalid_alert_tone' => 'Âm báo không có trong danh sách.',
    ],
    'preview' => [
        'deleted' => 'Tin nhắn đã thu hồi',
        'image' => 'Đã gửi một ảnh',
        'file' => 'Đã gửi một tệp',
        'sticker' => 'Sticker',
    ],
    'delivery' => [
        'numbered_prompt' => 'Nhắn số tương ứng để chọn:',
    ],
    'bank_transfer' => [
        'preview' => 'Chuyển khoản qua :bank',
        'bank_line' => 'Ngân hàng :bank, số TK :account',
        'holder' => 'Chủ TK :name',
        'amount' => 'Số tiền :amount',
        'memo' => 'Nội dung: :memo',
    ],
    // Chuỗi của message kit (resources/js/shared/messaging), placeholder dạng {tên}.
    'kit' => [
        'copied' => 'Đã chép',
        'copy' => 'Chép {label}',
        'read_only' => 'Khách bấm được trong widget',
        'bank_transfer_title' => 'Chuyển khoản ngân hàng',
        'show_qr' => 'Hiện mã QR để quét',
        'bank_transfer_qr_alt' => 'Mã QR chuyển khoản',
        'bank' => 'Ngân hàng',
        'account_number' => 'Số tài khoản',
        'account_holder' => 'Chủ tài khoản',
        'transfer_amount' => 'Số tiền',
        'transfer_memo' => 'Nội dung',
        'paid' => 'Đã nhận tiền',
    ],
];

<?php

// Bản dịch tiếng Việt của lang/en/general_settings.php.

return [
    'TITLE' => 'Cài đặt tài khoản',
    'DESCRIPTION' => 'Thiết lập chung cho cả tài khoản doanh nghiệp.',
    'LANGUAGE' => [
        'TITLE' => 'Ngôn ngữ',
        'NOTE' => 'Ngôn ngữ của widget chat trên website và của dashboard với những ai chưa tự chọn ngôn ngữ riêng. Trang nhúng widget vẫn chọn được ngôn ngữ khác bằng tuỳ chọn locale trong mã nhúng.',
        'UPDATE_SUCCESS' => 'Đã đổi ngôn ngữ tài khoản',
        'UPDATE_ERROR' => 'Chưa đổi được ngôn ngữ, bạn thử lại nhé',
    ],
    'BACK' => 'Trở về',
    'FORM' => [
        'AUTO_RESOLVE' => [
            'TITLE' => 'Tự động đánh dấu hội thoại đã xử lý xong',
            'NOTE' => 'Thiết lập này cho phép tự động đánh dấu hội thoại đã xử lý xong sau một khoảng thời gian không có hoạt động.',
            'DURATION' => [
                'LABEL' => 'Thời gian không hoạt động',
                'HELP' => 'Khoảng thời gian không có hoạt động, sau đó hội thoại tự được đánh dấu xử lý xong',
                'PLACEHOLDER' => '30',
                'ERROR' => 'Thời gian tự đánh dấu xử lý xong phải từ 10 phút đến 999 ngày',
                'API' => [
                    'SUCCESS' => 'Đã cập nhật thiết lập tự đánh dấu xử lý xong',
                    'ERROR' => 'Cập nhật thiết lập tự đánh dấu xử lý xong thất bại',
                ],
            ],
            'MESSAGE' => [
                'LABEL' => 'Tin nhắn tùy chỉnh khi tự đánh dấu xử lý xong',
                'PLACEHOLDER' => 'Hệ thống đánh dấu hội thoại là đã xử lý xong vì không có hoạt động nào trong 15 ngày',
                'HELP' => 'Tin nhắn gửi cho khách sau khi hội thoại tự được đánh dấu xử lý xong',
            ],
            'PREFERENCES' => 'Tùy chọn',
            'LABEL' => [
                'LABEL' => 'Gắn nhãn sau khi tự đánh dấu xử lý xong',
                'PLACEHOLDER' => 'Chọn một nhãn',
            ],
            'IGNORE_WAITING' => [
                'LABEL' => 'Bỏ qua hội thoại đang chờ nhân viên trả lời',
            ],
            'UPDATE_BUTTON' => 'Lưu thay đổi',
        ],
    ],
];

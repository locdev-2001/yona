<?php

// Bản dịch tiếng Việt của lang/en/general_settings.php.
// Nguồn: bản dịch `vi` của Chatwoot v4.17.1 (dashboard/widget/survey + config/locales/vi.yml);
// khóa Chatwoot chưa dịch và khóa riêng Yona được dịch mới trong đợt G3.

return [
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

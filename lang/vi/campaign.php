<?php

// Bản dịch tiếng Việt của lang/en/campaign.php.

return [
    'LIVE_CHAT' => [
        'HEADER_TITLE' => 'Chiến dịch chat trực tuyến',
        'NEW_CAMPAIGN' => 'Tạo chiến dịch',
        'CARD' => [
            'STATUS' => [
                'ENABLED' => 'Bật',
                'DISABLED' => 'Không bật',
            ],
            'CAMPAIGN_DETAILS' => [
                'SENT_BY' => 'Gửi bởi',
                'BOT' => 'Bot',
                'FROM' => 'từ',
                'URL' => 'URL:',
            ],
        ],
        'EMPTY_STATE' => [
            'TITLE' => 'Chưa có chiến dịch chat trực tuyến nào',
            'SUBTITLE' => 'Chủ động nhắn tin để kết nối với khách hàng. Bấm "Tạo chiến dịch" để bắt đầu.',
        ],
        'CREATE' => [
            'TITLE' => 'Tạo chiến dịch chat trực tuyến',
            'CANCEL_BUTTON_TEXT' => 'Huỷ',
            'CREATE_BUTTON_TEXT' => 'Tạo',
            'FORM' => [
                'TITLE' => [
                    'LABEL' => 'Tiêu đề',
                    'PLACEHOLDER' => 'Vui lòng điền tiêu đề của chiến dịch',
                    'ERROR' => 'Tiêu đề bắt buộc có',
                ],
                'MESSAGE' => [
                    'LABEL' => 'Tin nhắn',
                    'PLACEHOLDER' => 'Vui lòng điền thông điệp của chiến dịch',
                    'ERROR' => 'Thông điệp bắt buộc có',
                ],
                'INBOX' => [
                    'LABEL' => 'Chọn hộp thư',
                    'PLACEHOLDER' => 'Chọn hộp thư',
                    'ERROR' => 'Cần phải có kênh',
                ],
                'SENT_BY' => [
                    'LABEL' => 'Gửi bởi',
                    'PLACEHOLDER' => 'Bạn hãy chọn người gửi',
                    'ERROR' => 'Người gửi cần có',
                ],
                'END_POINT' => [
                    'LABEL' => 'URL',
                    'PLACEHOLDER' => 'Vui lòng nhập URL',
                    'ERROR' => 'Vui lòng nhập một URL hợp lệ',
                ],
                'TIME_ON_PAGE' => [
                    'LABEL' => 'Thời gian trên trang(Giây)',
                    'PLACEHOLDER' => 'Vui lòng nhập thời gian',
                    'ERROR' => 'Thời gian trên trang là bắt buộc',
                ],
                'OTHER_PREFERENCES' => [
                    'TITLE' => 'Tùy chọn khác',
                    'ENABLED' => 'Vận hành chiến dịch',
                    'TRIGGER_ONLY_BUSINESS_HOURS' => 'Chỉ kích hoạt trong giờ làm việc',
                ],
                'BUTTONS' => [
                    'CREATE' => 'Tạo',
                    'CANCEL' => 'Huỷ',
                ],
                'API' => [
                    'SUCCESS_MESSAGE' => 'Đã tạo chiến dịch chat trực tuyến',
                    'ERROR_MESSAGE' => 'Đã có lỗi. Vui lòng thử lại.',
                ],
            ],
        ],
        'EDIT' => [
            'TITLE' => 'Sửa chiến dịch chat trực tuyến',
            'FORM' => [
                'API' => [
                    'SUCCESS_MESSAGE' => 'Đã cập nhật chiến dịch chat trực tuyến',
                    'ERROR_MESSAGE' => 'Đã có lỗi. Vui lòng thử lại.',
                ],
            ],
        ],
    ],
    'CONFIRM_DELETE' => [
        'TITLE' => 'Bạn có chắc muốn xoá?',
        'DESCRIPTION' => 'Thao tác xóa là vĩnh viễn, không thể hoàn tác.',
        'CONFIRM' => 'Xoá',
        'API' => [
            'SUCCESS_MESSAGE' => 'Chiến dịch được xoá thành công',
            'ERROR_MESSAGE' => 'Đã có lỗi. Vui lòng thử lại.',
        ],
    ],
];

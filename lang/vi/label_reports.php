<?php

// Bản dịch tiếng Việt của lang/en/label_reports.php.
// Nguồn: bản dịch `vi` của Chatwoot v4.17.1 (dashboard/widget/survey + config/locales/vi.yml);
// khóa Chatwoot chưa dịch và khóa riêng Yona được dịch mới trong đợt G3.

return [
    'HEADER' => 'Tổng quan nhãn',
    'DESCRIPTION' => 'Theo dõi hiệu quả của từng nhãn qua các chỉ số chính như số hội thoại, thời gian phản hồi, thời gian xử lý và số ca đã xong. Bấm vào tên nhãn để xem chi tiết.',
    'LOADING_CHART' => 'Đang tải các biểu đồ dữ liệu...',
    'NO_ENOUGH_DATA' => 'Chúng tôi không nhận được đủ điểm dữ liệu để tạo báo cáo, Vui lòng thử lại sau.',
    'DOWNLOAD_LABEL_REPORTS' => 'Tải xuống báo cáo nhãn',
    'FILTER_DROPDOWN_LABEL' => 'Chọn Nhãn',
    'FILTERS' => [
        'INPUT_PLACEHOLDER' => [
            'LABELS' => 'Tìm nhãn',
        ],
    ],
    'METRICS' => [
        'CONVERSATIONS' => [
            'NAME' => 'Các hội thoại',
            'DESC' => '( Tổng cộng )',
        ],
        'INCOMING_MESSAGES' => [
            'NAME' => 'Tin nhắn nhận được',
            'DESC' => '( Tổng cộng )',
        ],
        'OUTGOING_MESSAGES' => [
            'NAME' => 'Tin nhắn gửi đi',
            'DESC' => '( Tổng cộng )',
        ],
        'FIRST_RESPONSE_TIME' => [
            'NAME' => 'Thời gian phản hồi đầu tiên',
            'DESC' => '( Trung bình )',
            'INFO_TEXT' => 'Tổng số hội thoại được sử dụng để tính toán:',
            'TOOLTIP_TEXT' => 'Thời gian phản hồi đầu tiên là {metricValue} (dựa trên {conversationCount} hội thoại)',
        ],
        'RESOLUTION_TIME' => [
            'NAME' => 'Thời gian giải quyết',
            'DESC' => '( Trung bình )',
            'INFO_TEXT' => 'Tổng số hội thoại được sử dụng để tính toán:',
            'TOOLTIP_TEXT' => 'Thời gian giải quyết là {metricValue} (dựa trên {conversationCount} hội thoại)',
        ],
        'RESOLUTION_COUNT' => [
            'NAME' => 'Số lượng giải quyết',
            'DESC' => '( Tổng cộng )',
        ],
    ],
    'CUSTOM_DATE_RANGE' => [
        'CONFIRM' => 'Áp dụng',
        'PLACEHOLDER' => 'Chọn phạm vi ngày',
    ],
];

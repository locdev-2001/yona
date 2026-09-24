<?php

// Bản dịch tiếng Việt của lang/en/agent_reports.php.

return [
    'HEADER' => 'Tổng quan nhân viên',
    'DESCRIPTION' => 'Theo dõi hiệu suất nhân viên bằng các chỉ số chính như số hội thoại, thời gian phản hồi, thời gian xử lý và số ca đã xong. Bấm vào tên nhân viên để xem chi tiết.',
    'LOADING_CHART' => 'Đang tải các biểu đồ dữ liệu...',
    'NO_ENOUGH_DATA' => 'Chúng tôi không nhận được đủ điểm dữ liệu để tạo báo cáo, Vui lòng thử lại sau.',
    'DOWNLOAD_AGENT_REPORTS' => 'Tải xuống báo cáo nhân viên',
    'FILTER_DROPDOWN_LABEL' => 'Chọn nhân viên',
    'FILTERS' => [
        'INPUT_PLACEHOLDER' => [
            'AGENTS' => 'Tìm kiếm nhân viên',
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

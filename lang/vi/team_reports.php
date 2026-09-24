<?php

// Bản dịch tiếng Việt của lang/en/team_reports.php.

return [
    'HEADER' => 'Tổng quan nhóm',
    'DESCRIPTION' => 'Xem nhanh hiệu suất của nhóm qua các chỉ số quan trọng như số hội thoại, thời gian phản hồi, thời gian xử lý và số ca đã xong. Bấm vào tên nhóm để xem chi tiết.',
    'LOADING_CHART' => 'Đang tải các biểu đồ dữ liệu...',
    'NO_ENOUGH_DATA' => 'Chúng tôi không nhận được đủ điểm dữ liệu để tạo báo cáo, Vui lòng thử lại sau.',
    'DOWNLOAD_TEAM_REPORTS' => 'Tải xuống báo cáo nhóm',
    'FILTER_DROPDOWN_LABEL' => 'Chọn nhóm',
    'FILTERS' => [
        'ADD_FILTER' => 'Thêm bộ lọc',
        'CLEAR_ALL' => 'Xóa tất cả',
        'NO_FILTER' => 'Không có bộ lọc nào',
        'INPUT_PLACEHOLDER' => [
            'TEAMS' => 'Tìm kiếm nhóm',
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

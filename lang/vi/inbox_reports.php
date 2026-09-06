<?php

// Bản dịch tiếng Việt của lang/en/inbox_reports.php.
// Nguồn: bản dịch `vi` của Chatwoot v4.17.1 (dashboard/widget/survey + config/locales/vi.yml);
// khóa Chatwoot chưa dịch và khóa riêng Yona được dịch mới trong đợt G3.

return [
    'HEADER' => 'Tổng quan hộp thư',
    'DESCRIPTION' => 'Xem nhanh hiệu suất hộp thư với các chỉ số chính như số hội thoại, thời gian phản hồi, thời gian xử lý và số ca đã xong — tất cả trong một chỗ. Bấm vào tên hộp thư để xem chi tiết.',
    'LOADING_CHART' => 'Đang tải các biểu đồ dữ liệu...',
    'NO_ENOUGH_DATA' => 'Chúng tôi không nhận được đủ điểm dữ liệu để tạo báo cáo, Vui lòng thử lại sau.',
    'DOWNLOAD_INBOX_REPORTS' => 'Tải xuống báo cáo hộp thư',
    'FILTER_DROPDOWN_LABEL' => 'Chọn hộp thư',
    'ALL_INBOXES' => 'Tất cả hộp thư',
    'SEARCH_INBOX' => 'Tìm hộp thư',
    'FILTERS' => [
        'INPUT_PLACEHOLDER' => [
            'INBOXES' => 'Tìm hộp thư',
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

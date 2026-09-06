<?php

// Bản dịch tiếng Việt của lang/en/report.php.
// Nguồn: bản dịch `vi` của Chatwoot v4.17.1 (dashboard/widget/survey + config/locales/vi.yml);
// khóa Chatwoot chưa dịch và khóa riêng Yona được dịch mới trong đợt G3.

return [
    'HEADER' => 'Các hội thoại',
    'LOADING_CHART' => 'Đang tải các biểu đồ dữ liệu...',
    'NO_ENOUGH_DATA' => 'Chúng tôi không nhận được đủ điểm dữ liệu để tạo báo cáo, Vui lòng thử lại sau.',
    'DOWNLOAD_CONVERSATION_REPORTS' => 'Tải báo cáo hội thoại',
    'DATA_FETCHING_FAILED' => 'Không tải được dữ liệu, bạn hãy thử lại sau.',
    'SUMMARY_FETCHING_FAILED' => 'Không tải được phần tóm tắt, bạn hãy thử lại sau.',
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
            'TOOLTIP_DESCRIPTION' => 'Dựa trên {count} hội thoại | Dựa trên {count} hội thoại',
            'TOOLTIP_TEXT' => 'Thời gian phản hồi đầu tiên là {metricValue} (dựa trên {conversationCount} hội thoại)',
        ],
        'RESOLUTION_TIME' => [
            'NAME' => 'Thời gian giải quyết',
            'DESC' => '( Trung bình )',
            'INFO_TEXT' => 'Tổng số hội thoại được sử dụng để tính toán:',
            'TOOLTIP_DESCRIPTION' => 'Dựa trên {count} hội thoại | Dựa trên {count} hội thoại',
            'TOOLTIP_TEXT' => 'Thời gian giải quyết là {metricValue} (dựa trên {conversationCount} hội thoại)',
        ],
        'RESOLUTION_COUNT' => [
            'NAME' => 'Số lượng giải quyết',
            'DESC' => '( Tổng cộng )',
        ],
        'BOT_RESOLUTION_COUNT' => [
            'NAME' => 'Số lượng giải quyết',
            'DESC' => '( Tổng cộng )',
        ],
        'BOT_HANDOFF_COUNT' => [
            'NAME' => 'Số lần chuyển giao',
            'DESC' => '( Tổng cộng )',
        ],
        'REPLY_TIME' => [
            'NAME' => 'Thời gian khách chờ',
            'TOOLTIP_LABEL' => 'Thời gian khách chờ',
            'TOOLTIP_DESCRIPTION' => 'Dựa trên {count} lượt trả lời | Dựa trên {count} lượt trả lời',
            'TOOLTIP_TEXT' => 'Thời gian chờ là {metricValue} (dựa trên {conversationCount} lượt trả lời)',
            'DESC' => '',
        ],
    ],
    'DATE_RANGE_OPTIONS' => [
        'LAST_7_DAYS' => '7 ngày cuối',
        'LAST_14_DAYS' => '14 ngày cuối',
        'LAST_30_DAYS' => '30 ngày cuối',
        'THIS_MONTH' => 'Tháng này',
        'LAST_MONTH' => 'Tháng trước',
        'LAST_3_MONTHS' => '3 tháng vừa qua',
        'LAST_6_MONTHS' => '6 tháng vừa qua',
        'LAST_YEAR' => 'Năm ngoái',
        'CUSTOM_DATE_RANGE' => 'Phạm vi ngày tùy chỉnh',
    ],
    'CUSTOM_DATE_RANGE' => [
        'CONFIRM' => 'Áp dụng',
        'PLACEHOLDER' => 'Chọn phạm vi ngày',
    ],
    'GROUP_BY_FILTER_DROPDOWN_LABEL' => 'Nhóm theo',
    'DURATION_FILTER_LABEL' => 'Thời lượng',
    'GROUPING_OPTIONS' => [
        'DAY' => 'Ngày',
        'WEEK' => 'Tuần',
        'MONTH' => 'Tháng',
        'YEAR' => 'Năm',
    ],
    'BUSINESS_HOURS' => 'Giờ làm việc',
    'FILTER_ACTIONS' => [
        'CLEAR_FILTER' => 'Xóa bộ lọc',
        'EMPTY_LIST' => 'Không tìm thấy kết quả',
    ],
    'DRILLDOWN' => [
        'TITLE' => 'Chi tiết {metric}',
        'RESULT_COUNT_CONVERSATION' => '{count} hội thoại | {count} hội thoại',
        'RESULT_COUNT_MESSAGE' => '{count} tin nhắn | {count} tin nhắn',
        'EMPTY' => 'Không có bản ghi nào cho cột này.',
        'ERROR' => 'Không tải được bản ghi. Bạn hãy thử lại.',
        'ADMIN_ONLY' => 'Chỉ quản trị viên mới xem được chi tiết bản ghi trong báo cáo.',
        'LOAD_MORE' => 'Tải thêm',
        'PREVIOUS_BUCKET' => 'Cột trước',
        'NEXT_BUCKET' => 'Cột sau',
        'UNKNOWN_CONTACT' => 'Liên hệ không rõ',
        'UNKNOWN_INBOX' => 'Hộp thư không rõ',
        'UNASSIGNED_AGENT' => 'Chưa được phân công',
        'NO_MESSAGE_CONTENT' => 'Không có nội dung tin nhắn',
        'MESSAGE_CREATED_AT' => 'Tin nhắn tạo lúc {time}',
        'EVENT_OCCURRED_AT' => 'Sự kiện xảy ra lúc {time}',
        'INCOMING_MESSAGE' => 'Tin nhắn đến',
        'OUTGOING_MESSAGE' => 'Tin nhắn đi',
    ],
    'PAGINATION' => [
        'RESULTS' => 'Hiển thị {start} đến {end} trong {total} kết quả',
        'PER_PAGE_TEMPLATE' => '{size} / trang',
    ],
];

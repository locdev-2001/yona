<?php

// Bản dịch tiếng Việt của lang/en/errors.php.
// Nguồn: bản dịch `vi` của Chatwoot v4.17.1 (dashboard/widget/survey + config/locales/vi.yml);
// khóa Chatwoot chưa dịch và khóa riêng Yona được dịch mới trong đợt G3.

return [
    'webhook' => [
        'invalid' => 'Sự kiện không hợp lệ',
    ],
    'openai' => [
        'invalid_api_key' => 'API key của OpenAI không hợp lệ hoặc đã bị thu hồi. Hãy kiểm tra lại khóa trong bảng điều khiển OpenAI của bạn.',
    ],
    'dyte' => [
        'invalid_message_type' => 'Loại tin nhắn không hợp lệ. Hành động không được phép',
        'realtimekit_credentials_required' => 'Cần có thông tin xác thực Cloudflare RealtimeKit. Hãy xóa kết nối Dyte hiện có và tạo lại bằng thông tin Cloudflare RealtimeKit.',
    ],
    'slack' => [
        'invalid_channel_id' => 'Kênh Slack không hợp lệ. Bạn hãy thử lại',
    ],
    'reports' => [
        'date_range_too_long' => 'Khoảng thời gian không được quá 6 tháng',
    ],
    'conversations' => [
        'resolved' => 'Hội thoại đã kết thúc nên không nhận thêm tin nhắn',
    ],
    'custom_filters' => [
        'number_of_records' => 'Đã đạt giới hạn. Số lượng tuỳ chọn lọc tối đa cho mỗi mỗi người dùng mỗi tài khoản là 1000.',
        'invalid_attribute' => 'Invalid attribute key - [{key}]. The key should be one of [{allowed_keys}] or a custom attribute defined in the account.',
        'invalid_operator' => 'Invalid operator. The allowed operators for {attribute_name} are [{allowed_keys}].',
        'invalid_query_operator' => 'Toán tử điều kiện phải là "AND" hoặc "OR".',
        'invalid_value' => 'Invalid value. The values provided for {attribute_name} are invalid',
    ],
    'mfa' => [
        'already_enabled' => 'Xác thực hai lớp đã bật rồi',
        'not_enabled' => 'Chưa bật xác thực hai lớp',
        'invalid_code' => 'Mã xác minh không đúng',
        'invalid_backup_code' => 'Mã dự phòng không đúng',
        'invalid_token' => 'Token xác thực hai lớp sai hoặc đã hết hạn',
        'invalid_credentials' => 'Thông tin đăng nhập hoặc mã xác minh không đúng',
        'feature_unavailable' => 'Chưa dùng được xác thực hai lớp. Bạn hãy cấu hình khóa mã hóa.',
    ],
    'sessions' => [
        'cannot_revoke_current' => 'Bạn không thể thu hồi phiên đang dùng.',
    ],
    'contacts' => [
        'import' => [
            'failed' => 'Chưa chọn tệp',
        ],
        'export' => [
            'success' => 'Chúng tôi sẽ thông báo khi tệp xuất danh sách liên hệ đã sẵn sàng.',
        ],
    ],
    'custom_attribute_definition' => [
        'attribute_key_format' => 'chỉ được chứa chữ cái, chữ số, dấu gạch dưới, dấu gạch nối và dấu chấm',
        'key_conflict' => 'Khóa này không dùng được vì có thể trùng với thuộc tính mặc định.',
    ],
];

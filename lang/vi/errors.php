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
    ],
    'sessions' => [
        'cannot_revoke_current' => 'Bạn không thể thu hồi phiên đang dùng.',
    ],
    'contacts' => [
        'phone_number_invalid' => 'Số điện thoại không hợp lệ. Nhập số trong nước như 0912 345 678, hoặc số nước ngoài kèm mã nước như +1 202 555 0123.',
        'import' => [
            'failed' => 'Chưa chọn tệp',
        ],
        'export' => [
            'success' => 'Chúng tôi sẽ thông báo khi tệp xuất danh sách liên hệ đã sẵn sàng.',
        ],
    ],
    // Kênh Zalo cá nhân — lý do gửi hỏng, khớp `content_attributes.external_error.code`
    // (App\Services\Zalo\SendOnZaloService). FE dùng `code` để chọn hành động,
    // `message` để hiện cho agent.
    'zalo' => [
        'send' => [
            'circuit_open' => 'Kết nối Zalo đang lỗi liên tục, tạm dừng gửi một lát.',
            'session_lost' => 'Phiên Zalo đã hết, bạn quét lại mã QR giúp mình nhé.',
            'bridge_unreachable' => 'Chưa gọi được dịch vụ Zalo, bạn thử lại sau ít phút.',
            'secret_mismatch' => 'Dịch vụ Zalo đang sai cấu hình (khoá gửi tin), bạn báo quản trị viên giúp nhé.',
            'zalo_rejected' => 'Zalo từ chối tin này (:detail).',
            'media_fetch_failed' => 'Không đọc được tệp đính kèm để gửi (:detail).',
            'unknown' => 'Chưa gửi được tin này ra Zalo (:detail).',
            'attachment_failed' => 'Không gửi được tệp ":filename": :reason',
        ],
        'action' => [
            'session_lost' => 'Phiên Zalo đã hết, bạn quét lại mã QR giúp mình nhé.',
            'bridge_unreachable' => 'Chưa gọi được dịch vụ Zalo, bạn thử lại sau ít phút.',
            'secret_mismatch' => 'Dịch vụ Zalo đang sai cấu hình (khoá gửi tin), bạn báo quản trị viên giúp nhé.',
            'zalo_rejected' => 'Zalo từ chối thao tác này (:detail).',
            'bad_request' => 'Zalo không còn nhận ra tin này (:detail).',
            'missing_source_id' => 'Tin này chưa sang tới Zalo nên chưa đổi được ở đó.',
            'emoji_not_supported' => 'Zalo không có biểu cảm này.',
            'unknown' => 'Thao tác này chưa sang được Zalo (:detail).',
        ],
    ],
    // Bảng chọn sticker và tin sticker (App\Services\Channels\Stickers). Lỗi phía
    // kênh dùng lại câu của từng kênh; ở đây chỉ là luật chung của lõi.
    'stickers' => [
        'capability_not_supported' => 'Kênh này chưa gửi được sticker.',
        'not_found' => 'Không tìm thấy sticker này, bạn chọn sticker khác giúp mình nhé.',
        'bad_request' => 'Chưa tìm được sticker với từ khoá này, bạn thử từ khoá khác nhé.',
        'private_note' => 'Không gửi sticker trong ghi chú riêng được.',
        'outgoing_only' => 'Sticker chỉ gửi được trong tin trả lời khách.',
        'with_attachments' => 'Sticker được gửi riêng, không kèm tệp.',
        'missing_sticker_id' => 'Bạn chọn một sticker để gửi nhé.',
    ],
    'widget_recall' => [
        'capability_not_supported' => 'Kênh này chưa cho thu hồi tin nhắn.',
        'not_own_message' => 'Bạn chỉ thu hồi được tin nhắn của chính mình.',
        'already_recalled' => 'Tin nhắn này đã được thu hồi.',
        'recall_window_expired' => 'Đã quá hạn thu hồi tin nhắn này.',
    ],
    'forward' => [
        'not_forwardable' => 'Loại tin này chưa chuyển tiếp được.',
        'attachment_unavailable' => 'Tệp :filename không còn trên máy chủ nên không chuyển tiếp được.',
        'capability_not_supported' => 'Hộp thư :inbox không gửi được :items.',
        'sticker_unavailable' => 'Hộp thư :inbox không gửi được sticker này.',
        'reply_window_closed' => 'Hội thoại này đã hết thời gian được phép trả lời.',
        'target_not_found' => 'Không tìm thấy hội thoại hoặc bạn không có quyền.',
        'no_targets' => 'Chọn ít nhất một hội thoại.',
        'too_many_targets' => 'Mỗi lần chuyển tiếp tối đa :max hội thoại.',
        'capabilities' => [
            'outbound_text' => 'tin chữ',
            'outbound_image' => 'ảnh',
            'outbound_video' => 'video',
            'outbound_audio' => 'âm thanh',
            'outbound_file' => 'tệp',
            'outbound_sticker' => 'sticker',
        ],
    ],
    'custom_attribute_definition' => [
        'attribute_key_format' => 'chỉ được chứa chữ cái, chữ số, dấu gạch dưới, dấu gạch nối và dấu chấm',
        'key_conflict' => 'Khóa này không dùng được vì có thể trùng với thuộc tính mặc định.',
    ],
];

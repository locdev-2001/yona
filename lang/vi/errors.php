<?php

// Bản dịch tiếng Việt của lang/en/errors.php.

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
        'email_taken' => 'Email này đã thuộc về một liên hệ khác',
        'phone_number_taken' => 'Số điện thoại này đã thuộc về một liên hệ khác',
        'identifier_taken' => 'Mã định danh này đã thuộc về một liên hệ khác',
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
    'sticker_uploads' => [
        'unsupported_file_type' => 'Chỉ nhận sticker dạng Lottie (.json) hoặc .tgs.',
        'file_too_large' => 'Tệp sticker tối đa :max_upload_kb KB.',
        'file_unreadable' => 'Không đọc được tệp vừa tải lên, bạn thử lại nhé.',
        'invalid_gzip' => 'Tệp .tgs bị hỏng, không giải nén được.',
        'decompressed_too_large' => 'Sticker sau khi giải nén vượt :max_decompressed_kb KB.',
        'invalid_json' => 'Tệp không phải JSON hợp lệ.',
        'nesting_too_deep' => 'Cấu trúc sticker lồng quá sâu.',
        'invalid_lottie' => 'Tệp không phải hoạt ảnh Lottie hợp lệ.',
        'canvas_too_large' => 'Khung sticker tối đa :max_canvas×:max_canvas px.',
        'frame_rate_too_high' => 'Sticker tối đa :max_frame_rate khung hình mỗi giây.',
        'duration_too_long' => 'Sticker dài tối đa :max_seconds giây.',
        'text_not_allowed' => 'Sticker không được chứa lớp chữ hay font, bạn chuyển chữ thành hình trước khi xuất nhé.',
        'expression_not_allowed' => 'Sticker không được dùng expression, bạn bake expression thành keyframe trước khi xuất nhé.',
        'embedded_image_not_allowed' => 'Sticker không được nhúng ảnh bitmap, chỉ dùng hình vector.',
        'external_image_not_allowed' => 'Sticker không được tải ảnh từ nơi khác, chỉ dùng hình vector.',
        'precomp_cycle' => 'Sticker có precomp tự tham chiếu vòng.',
        'precomp_too_deep' => 'Sticker lồng precomp quá :max_precomp_depth tầng.',
        'too_many_layers' => 'Sticker quá nhiều lớp (tối đa :max_layers).',
        'too_many_shapes' => 'Sticker quá nhiều hình (tối đa :max_shapes).',
        'repeater_too_large' => 'Repeater trong sticker nhân quá :max_repeater_copies bản.',
        'polystar_too_complex' => 'Hình sao/đa giác trong sticker có quá :max_polystar_points đỉnh.',
        'render_failed' => 'Không dựng được ảnh xem trước cho sticker này.',
        'render_timeout' => 'Sticker quá phức tạp, dựng ảnh xem trước quá lâu.',
        'renderer_unavailable' => 'Máy chủ chưa dựng được ảnh sticker lúc này, bạn thử lại sau nhé.',
        'storage_write_failed' => 'Không lưu được tệp sticker, bạn thử lại sau nhé.',
    ],
    'sticker_library' => [
        'pack_full' => 'Mỗi bộ có tối đa :max sticker. Bạn xoá bớt hoặc tạo bộ mới nhé.',
        'too_many_packs' => 'Mỗi account có tối đa :max bộ sticker.',
        'upload_throttled' => 'Bạn tải sticker hơi nhanh, chờ một chút rồi thử lại nhé.',
        'not_found' => 'Không tìm thấy bộ hoặc sticker này trong kho chung.',
        'invalid_base64' => 'tgs_base64 không phải chuỗi base64 hợp lệ.',
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

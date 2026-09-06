<?php

// Bản dịch tiếng Việt của lang/en/captain_settings.php.
// Nguồn: bản dịch `vi` của Chatwoot v4.17.1 (dashboard/widget/survey + config/locales/vi.yml);
// khóa Chatwoot chưa dịch và khóa riêng Yona được dịch mới trong đợt G3.

return [
    'TITLE' => 'Thiết lập Captain',
    'DESCRIPTION' => 'Cấu hình mô hình AI và tính năng cho Captain. Captain tính phí theo tín dụng; mỗi hành động Captain thực hiện sẽ trừ tín dụng tùy mô hình bạn chọn.',
    'LOADING' => 'Đang tải cấu hình Captain...',
    'LINK_TEXT' => 'Tìm hiểu thêm về tín dụng Captain',
    'NOT_ENABLED' => 'Tài khoản của bạn chưa bật Captain. Hãy nâng cấp gói để dùng các tính năng Captain.',
    'MODEL_CONFIG' => [
        'TITLE' => 'Cấu hình mô hình',
        'DESCRIPTION' => 'Chọn mô hình AI cho từng tính năng.',
        'SELECT_MODEL' => 'Chọn mô hình',
        'CREDITS_PER_MESSAGE' => '{credits} tín dụng/tin nhắn',
        'COMING_SOON' => 'Sắp có',
        'EDITOR' => [
            'TITLE' => 'Tính năng soạn thảo',
            'DESCRIPTION' => 'Hỗ trợ soạn tin thông minh, sửa ngữ pháp, chỉnh giọng văn và trau chuốt nội dung trong trình soạn tin nhắn.',
        ],
        'ASSISTANT' => [
            'TITLE' => 'Trợ lý',
            'DESCRIPTION' => 'Xử lý câu trả lời tự động, tóm tắt hội thoại và gợi ý câu trả lời thông minh khi trao đổi với khách.',
        ],
        'COPILOT' => [
            'TITLE' => 'Co-pilot',
            'DESCRIPTION' => 'Đưa gợi ý theo bối cảnh, gợi ý bài viết trong kho kiến thức và nhận định chủ động ngay trong lúc trò chuyện.',
        ],
    ],
    'FEATURES' => [
        'TITLE' => 'Các tính năng',
        'DESCRIPTION' => 'Bật hoặc tắt các tính năng dùng AI.',
        'AUDIO_TRANSCRIPTION' => [
            'TITLE' => 'Chuyển giọng nói thành văn bản',
            'DESCRIPTION' => 'Tự động chuyển tin nhắn thoại và bản ghi cuộc gọi thành văn bản tìm kiếm được.',
            'MODEL_TITLE' => 'Mô hình chuyển giọng nói thành văn bản',
            'MODEL_DESCRIPTION' => 'Chọn mô hình AI dùng để chuyển tin nhắn thoại thành văn bản',
        ],
        'HELP_CENTER_SEARCH' => [
            'TITLE' => 'Lập chỉ mục tìm kiếm trung tâm trợ giúp',
            'DESCRIPTION' => 'Dùng AI để tìm kiếm theo ngữ cảnh trong các bài viết trung tâm trợ giúp.',
        ],
        'LABEL_SUGGESTION' => [
            'TITLE' => 'Gợi ý nhãn',
            'DESCRIPTION' => 'Tự động gợi ý nhãn phù hợp cho hội thoại dựa trên nội dung và bối cảnh.',
            'MODEL_TITLE' => 'Mô hình gợi ý nhãn',
            'MODEL_DESCRIPTION' => 'Chọn mô hình AI dùng để phân tích hội thoại và gợi ý nhãn phù hợp',
        ],
    ],
    'API' => [
        'SUCCESS' => 'Đã cập nhật thiết lập Captain.',
        'ERROR' => 'Cập nhật thiết lập Captain thất bại. Bạn hãy thử lại.',
    ],
];

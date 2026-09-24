<?php

// Bản dịch tiếng Việt của lang/en/conversation_workflow.php.

return [
    'INDEX' => [
        'HEADER' => [
            'TITLE' => 'Luồng hội thoại',
            'DESCRIPTION' => 'Cấu hình quy tắc và các trường bắt buộc khi xử lý xong hội thoại.',
        ],
    ],
    'REQUIRED_ATTRIBUTES' => [
        'TITLE' => 'Thuộc tính bắt buộc khi xử lý xong',
        'DESCRIPTION' => 'Khi đánh dấu hội thoại đã xử lý xong, nhân viên sẽ được nhắc điền những thuộc tính này nếu chưa có.',
        'NO_ATTRIBUTES' => 'Chưa thêm thuộc tính nào',
        'ADD' => [
            'TITLE' => 'Thêm thuộc tính',
            'SEARCH_PLACEHOLDER' => 'Tìm kiếm nhiều thuộc tính',
        ],
        'SAVE' => [
            'SUCCESS' => 'Đã cập nhật thuộc tính bắt buộc',
            'ERROR' => 'Không cập nhật được thuộc tính bắt buộc, bạn hãy thử lại',
        ],
        'MODAL' => [
            'TITLE' => 'Giải quyết hội thoại',
            'DESCRIPTION' => 'Hãy điền các thuộc tính tùy chỉnh sau trước khi đánh dấu hội thoại đã xử lý xong',
            'ACTIONS' => [
                'RESOLVE' => 'Giải quyết hội thoại',
                'CANCEL' => 'Huỷ',
            ],
            'PLACEHOLDERS' => [
                'TEXT' => 'Viết ghi chú...',
                'NUMBER' => 'Nhập một con số',
                'LINK' => 'Thêm liên kết',
                'DATE' => 'Chọn ngày',
                'LIST' => 'Chọn một mục',
            ],
            'CHECKBOX' => [
                'YES' => 'Có',
                'NO' => 'Không',
            ],
        ],
        'PAYWALL' => [
            'TITLE' => 'Nâng cấp để dùng thuộc tính bắt buộc',
            'AVAILABLE_ON' => 'Tính năng thuộc tính hội thoại bắt buộc có ở gói Business và Enterprise.',
            'UPGRADE_PROMPT' => 'Hãy nâng cấp gói để nhắc nhân viên điền thuộc tính bắt buộc trước khi đóng hội thoại.',
            'UPGRADE_NOW' => 'Nâng cấp ngay',
            'CANCEL_ANYTIME' => 'Bạn có thể đổi hoặc hủy gói bất cứ lúc nào',
        ],
        'ENTERPRISE_PAYWALL' => [
            'AVAILABLE_ON' => 'Tính năng thuộc tính hội thoại bắt buộc có ở các gói trả phí.',
            'UPGRADE_PROMPT' => 'Hãy nâng cấp lên gói trả phí để bắt buộc điền thuộc tính trước khi đóng hội thoại.',
            'ASK_ADMIN' => 'Bạn hãy liên hệ quản trị viên để nâng cấp.',
        ],
    ],
];

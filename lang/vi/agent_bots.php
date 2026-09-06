<?php

// Bản dịch tiếng Việt của lang/en/agent_bots.php.
// Nguồn: bản dịch `vi` của Chatwoot v4.17.1 (dashboard/widget/survey + config/locales/vi.yml);
// khóa Chatwoot chưa dịch và khóa riêng Yona được dịch mới trong đợt G3.

return [
    'HEADER' => 'Bot',
    'LOADING_EDITOR' => 'Đang tải trình soạn thảo...',
    'DESCRIPTION' => 'Bot nhân viên giống như những thành viên xuất sắc nhất trong đội của bạn. Chúng lo việc lặt vặt để bạn tập trung vào việc quan trọng. Hãy thử xem. Bạn quản lý bot ở trang này hoặc tạo bot mới bằng nút "Thêm bot".',
    'LEARN_MORE' => 'Tìm hiểu về bot nhân viên',
    'COUNT' => '{n} bot | {n} bot',
    'SEARCH_PLACEHOLDER' => 'Tìm bot...',
    'NO_RESULTS' => 'Không tìm thấy bot nào khớp',
    'GLOBAL_BOT' => 'Bot hệ thống',
    'GLOBAL_BOT_BADGE' => 'Hệ thống',
    'AVATAR' => [
        'SUCCESS_DELETE' => 'Đã xóa ảnh đại diện của bot',
        'ERROR_DELETE' => 'Lỗi khi xóa ảnh đại diện của bot, bạn hãy thử lại',
    ],
    'BOT_CONFIGURATION' => [
        'TITLE' => 'Chọn một bot nhân viên',
        'DESC' => 'Gán một bot nhân viên cho hộp thư. Bot có thể xử lý phần đầu hội thoại rồi chuyển cho nhân viên thật khi cần.',
        'SUBMIT' => 'Cập nhật',
        'DISCONNECT' => 'Ngắt kết nối bot',
        'SUCCESS_MESSAGE' => 'Đã cập nhật bot nhân viên.',
        'DISCONNECTED_SUCCESS_MESSAGE' => 'Đã ngắt kết nối bot nhân viên.',
        'ERROR_MESSAGE' => 'Không cập nhật được bot nhân viên. Bạn hãy thử lại.',
        'DISCONNECTED_ERROR_MESSAGE' => 'Không ngắt kết nối được bot nhân viên. Bạn hãy thử lại.',
        'SELECT_PLACEHOLDER' => 'Chọn bot',
    ],
    'ADD' => [
        'TITLE' => 'Add Bot',
        'CANCEL_BUTTON_TEXT' => 'Huỷ',
        'API' => [
            'SUCCESS_MESSAGE' => 'Đã thêm bot.',
            'ERROR_MESSAGE' => 'Không thêm được bot. Bạn hãy thử lại sau.',
        ],
    ],
    'LIST' => [
        '404' => 'Chưa có bot nào. Bạn có thể tạo bot bằng nút "Thêm bot".',
        'LOADING' => 'Đang tải danh sách bot...',
        'TABLE_HEADER' => [
            'DETAILS' => 'Thông tin bot',
            'URL' => 'URL webhook',
            'ACTIONS' => 'Hành động',
        ],
    ],
    'DELETE' => [
        'BUTTON_TEXT' => 'Xoá',
        'TITLE' => 'Xóa bot',
        'CONFIRM' => [
            'TITLE' => 'Xác nhận xoá',
            'MESSAGE' => 'Bạn chắc chắn muốn xóa {name}?',
            'YES' => 'Có, Xoá',
            'NO' => 'Không, giữ',
        ],
        'API' => [
            'SUCCESS_MESSAGE' => 'Đã xóa bot.',
            'ERROR_MESSAGE' => 'Không xóa được bot. Bạn hãy thử lại.',
        ],
    ],
    'EDIT' => [
        'BUTTON_TEXT' => 'Chỉnh sửa',
        'TITLE' => 'Sửa bot',
        'API' => [
            'SUCCESS_MESSAGE' => 'Đã cập nhật bot.',
            'ERROR_MESSAGE' => 'Không cập nhật được bot. Bạn hãy thử lại.',
        ],
    ],
    'SECRET' => [
        'LABEL' => 'Khóa bí mật webhook',
        'COPY' => 'Chép khóa bí mật',
        'COPY_SUCCESS' => 'Đã chép khóa bí mật',
        'TOGGLE' => 'Ẩn/hiện khóa bí mật',
        'CREATED_DESC' => 'Dùng khóa bí mật bên dưới để xác minh chữ ký webhook. Hãy chép ngay, bạn cũng có thể xem lại trong phần cài đặt bot.',
        'DONE' => 'Xong',
        'RESET_SUCCESS' => 'Đã tạo lại khóa bí mật webhook',
        'RESET_ERROR' => 'Không tạo lại được khóa bí mật webhook. Bạn hãy thử lại',
    ],
    'ACCESS_TOKEN' => [
        'TITLE' => 'Token truy cập',
        'DESCRIPTION' => 'Chép access token và cất giữ an toàn',
        'COPY_SUCCESSFUL' => 'Đã chép access token',
        'RESET_SUCCESS' => 'Đã tạo lại access token',
        'RESET_ERROR' => 'Không tạo lại được access token. Bạn hãy thử lại',
    ],
    'FORM' => [
        'AVATAR' => [
            'LABEL' => 'Ảnh đại diện của bot',
        ],
        'NAME' => [
            'LABEL' => 'Tên bot',
            'PLACEHOLDER' => 'Nhập tên bot',
            'REQUIRED' => 'Tên bot là bắt buộc',
        ],
        'DESCRIPTION' => [
            'LABEL' => 'Mô tả',
            'PLACEHOLDER' => 'Bot này sẽ làm gì?',
        ],
        'WEBHOOK_URL' => [
            'LABEL' => 'URL webhook',
            'PLACEHOLDER' => 'https://example.com/webhook',
            'REQUIRED' => 'URL webhook là bắt buộc',
        ],
        'ERRORS' => [
            'NAME' => 'Tên bot là bắt buộc',
            'URL' => 'URL webhook là bắt buộc',
            'VALID_URL' => 'Bạn hãy nhập URL hợp lệ bắt đầu bằng http:// hoặc https://',
        ],
        'CANCEL' => 'Huỷ',
        'CREATE' => 'Tạo bot',
        'UPDATE' => 'Cập nhật bot',
    ],
    'WEBHOOK' => [
        'DESCRIPTION' => 'Cấu hình một bot webhook để nối với dịch vụ riêng của bạn. Bot sẽ nhận và xử lý sự kiện từ hội thoại rồi trả lời.',
    ],
    'TYPES' => [
        'WEBHOOK' => 'Bot webhook',
    ],
];

<?php

// Bản dịch tiếng Việt của lang/en/agent_mgmt.php.
// Nguồn: bản dịch `vi` của Chatwoot v4.17.1 (dashboard/widget/survey + config/locales/vi.yml);
// khóa Chatwoot chưa dịch và khóa riêng Yona được dịch mới trong đợt G3.

return [
    'HEADER' => 'Nhân viên',
    'HEADER_BTN_TXT' => 'Thêm nhà cung cấp / nhân viên',
    'LOADING' => 'Tải danh sách nhà cung cấp',
    'DESCRIPTION' => 'Nhân viên là thành viên trong đội chăm sóc khách hàng của bạn, có thể xem và trả lời tin nhắn của khách. Danh sách bên dưới là toàn bộ nhân viên trong tài khoản của bạn.',
    'LEARN_MORE' => 'Tìm hiểu về vai trò người dùng',
    'AGENT_TYPES' => [
        'ADMINISTRATOR' => 'Quản trị viên',
        'AGENT' => 'Nhân viên',
    ],
    'COUNT' => '{n} nhân viên | {n} nhân viên',
    'LIST' => [
        '404' => 'Không có tác nhân nào được liên kết với tài khoản này',
        'TITLE' => 'Quản lý các nhân viên trong nhóm của bạn',
        'DESC' => 'Bạn có thể thêm / bớt nhân viên vào / trong nhóm của mình.',
        'NAME' => 'Tên',
        'EMAIL' => 'EMAIL',
        'STATUS' => 'Trạng thái',
        'ACTIONS' => 'Hành động',
        'VERIFIED' => 'Đã xác minh',
        'VERIFICATION_PENDING' => 'Đang chờ xác minh',
        'AVAILABLE_CUSTOM_ROLE' => 'Quyền của vai trò tùy chỉnh hiện có',
    ],
    'ADD' => [
        'TITLE' => 'Thêm nhân viên vào nhóm của bạn',
        'DESC' => 'Bạn có thể thêm những người có thể xử lý hỗ trợ cho hộp thư của bạn.',
        'CANCEL_BUTTON_TEXT' => 'Huỷ',
        'FORM' => [
            'NAME' => [
                'LABEL' => 'Tên nhà cung cấp',
                'PLACEHOLDER' => 'Vui lòng nhập tên nhà cung cấp',
            ],
            'AGENT_TYPE' => [
                'LABEL' => 'Loại nhà cung cấp',
                'PLACEHOLDER' => 'Vui lòng chọn loại',
                'ERROR' => 'Loại nhà cung cấp là bắt buộc',
            ],
            'EMAIL' => [
                'LABEL' => 'Email',
                'PLACEHOLDER' => 'Vui lòng nhập email',
            ],
            'SUBMIT' => 'Thêm nhà cung cấp',
        ],
        'API' => [
            'SUCCESS_MESSAGE' => 'Nhân viên được thêm thành công',
            'EXIST_MESSAGE' => 'Email đã được sử dung, vui lòng chọn email khác.',
            'ERROR_MESSAGE' => 'Không thể kết nối với Máy chủ Woot, Vui lòng thử lại sau',
        ],
    ],
    'DELETE' => [
        'BUTTON_TEXT' => 'Xoá',
        'API' => [
            'SUCCESS_MESSAGE' => 'Nhân viên được xoá thành công',
            'ERROR_MESSAGE' => 'Không thể kết nối với Máy chủ Woot, Vui lòng thử lại sau',
        ],
        'CONFIRM' => [
            'TITLE' => 'Xác nhận xoá',
            'MESSAGE' => 'Bạn có muốn xoá? ',
            'YES' => 'Có, xoá ',
            'NO' => 'Không, giữ ',
        ],
    ],
    'EDIT' => [
        'TITLE' => 'Chỉnh sửa nhà cung cấp',
        'FORM' => [
            'NAME' => [
                'LABEL' => 'Tên nhà cung cấp',
                'PLACEHOLDER' => 'Vui lòng nhập tên nhà cung cấp',
            ],
            'AGENT_TYPE' => [
                'LABEL' => 'Loại nhà cung cấp',
                'PLACEHOLDER' => 'Vui lòng chọn loại',
                'ERROR' => 'Loại nhà cung cấp là bắt buộc',
            ],
            'EMAIL' => [
                'LABEL' => 'Emails',
                'PLACEHOLDER' => 'Vui lòng nhập email',
            ],
            'AGENT_AVAILABILITY' => [
                'LABEL' => 'Khả dụng',
                'PLACEHOLDER' => 'Bạn hãy chọn trạng thái trực',
                'ERROR' => 'Trạng thái trực là bắt buộc',
            ],
            'SUBMIT' => 'Chỉnh sửa nhà cung cấp',
        ],
        'BUTTON_TEXT' => 'Chỉnh sửa',
        'CANCEL_BUTTON_TEXT' => 'Huỷ',
        'API' => [
            'SUCCESS_MESSAGE' => 'Nhân viên được cập nhật thành công',
            'ERROR_MESSAGE' => 'Không thể kết nối với Máy chủ Woot, Vui lòng thử lại sau',
        ],
        'PASSWORD_RESET' => [
            'ADMIN_RESET_BUTTON' => 'Đặt lại mật khẩu',
            'ADMIN_SUCCESS_MESSAGE' => 'Một email với hướng dẫn đặt lại mật khẩu đã được gửi đến nhân viên',
            'SUCCESS_MESSAGE' => 'Đặt lại mật khẩu nhân viên thành công',
            'ERROR_MESSAGE' => 'Không thể kết nối với Máy chủ Woot, Vui lòng thử lại sau',
        ],
    ],
    'SEARCH_PLACEHOLDER' => 'Tìm kiếm nhân viên...',
    'NO_RESULTS' => 'Không tìm thấy nhân viên nào khớp',
    'SEARCH' => [
        'NO_RESULTS' => 'Không tìm thấy kết quả.',
    ],
    'MULTI_SELECTOR' => [
        'PLACEHOLDER' => 'Không có',
        'TITLE' => [
            'AGENT' => 'Chọn thành viên',
            'TEAM' => 'Chọn nhóm',
        ],
        'LIST' => [
            'NONE' => 'Không có',
        ],
        'SEARCH' => [
            'NO_RESULTS' => [
                'AGENT' => 'Không tìm thấy nhà cung cấp',
                'TEAM' => 'Không tìm thấy nhóm nào',
            ],
            'PLACEHOLDER' => [
                'AGENT' => 'Tìm kiếm nhân viên',
                'TEAM' => 'Tìm kiếm nhóm',
                'INPUT' => 'Tìm nhân viên',
            ],
        ],
    ],
];

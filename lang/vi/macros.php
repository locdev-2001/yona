<?php

// Bản dịch tiếng Việt của lang/en/macros.php.

return [
    'HEADER' => 'Macro',
    'DESCRIPTION' => 'Macro là một chuỗi hành động đã lưu sẵn giúp nhân viên chăm sóc khách hàng làm việc nhanh hơn. Nhân viên có thể đặt sẵn các hành động như gắn nhãn cho hội thoại, gửi bản ghi hội thoại qua email, cập nhật thuộc tính tùy chỉnh… rồi chạy tất cả chỉ bằng một cú bấm.',
    'LEARN_MORE' => 'Tìm hiểu thêm về macro',
    'COUNT' => '{n} macro | {n} macro',
    'HEADER_BTN_TXT' => 'Thêm macro mới',
    'HEADER_BTN_TXT_SAVE' => 'Lưu macro',
    'LOADING' => 'Đang tải danh sách macro',
    'SEARCH_PLACEHOLDER' => 'Tìm macro...',
    'NO_RESULTS' => 'Không tìm thấy macro nào khớp',
    'ERROR' => 'Có lỗi xảy ra. Bạn hãy thử lại',
    'ORDER_INFO' => 'Macro sẽ chạy theo thứ tự hành động của bạn. Bạn có thể sắp xếp lại chúng bằng cách kéo chúng bằng tay cầm bên cạnh mỗi nút.',
    'ADD' => [
        'FORM' => [
            'NAME' => [
                'LABEL' => 'Tên Macro',
                'PLACEHOLDER' => 'Nhập tên cho macro của bạn',
                'ERROR' => 'Cần có tên để tạo macro',
            ],
            'ACTIONS' => [
                'LABEL' => 'Hành động',
            ],
        ],
        'API' => [
            'SUCCESS_MESSAGE' => 'Đã thêm macro thành công',
            'ERROR_MESSAGE' => 'Không thể tạo macro, vui lòng thử lại sau',
        ],
    ],
    'LIST' => [
        'TABLE_HEADER' => [
            'NAME' => 'Tên',
            'CREATED BY' => 'Tạo bởi',
            'LAST_UPDATED_BY' => 'Cập nhật lần cuối bởi',
            'VISIBILITY' => 'Hiển thị',
            'ACTIONS' => 'Hành động',
        ],
        '404' => 'Không tìm thấy macro',
    ],
    'DELETE' => [
        'TOOLTIP' => 'Xóa Macro',
        'CONFIRM' => [
            'MESSAGE' => 'Bạn có muốn xoá',
            'YES' => 'Có, Xoá',
            'NO' => 'Không',
        ],
        'API' => [
            'SUCCESS_MESSAGE' => 'Xóa Macro thành công',
            'ERROR_MESSAGE' => 'Đã xảy ra lỗi khi xóa macro. Vui lòng thử lại sau',
        ],
    ],
    'VIEW' => [
        'TOOLTIP' => 'Xem macro',
    ],
    'EDIT' => [
        'TOOLTIP' => 'Sửa Macro',
        'API' => [
            'SUCCESS_MESSAGE' => 'Đã cập nhật macro thành công',
            'ERROR_MESSAGE' => 'Không thể cập nhật Macro, vui lòng thử lại sau',
        ],
    ],
    'EDITOR' => [
        'START_FLOW' => 'Bắt đầu quy trình',
        'END_FLOW' => 'Kết thúc quy trình',
        'LOADING' => 'Đang tìm nạp macro',
        'ADD_BTN_TOOLTIP' => 'Thêm hành động mới',
        'DELETE_BTN_TOOLTIP' => 'Xóa hành động',
        'VISIBILITY' => [
            'LABEL' => 'Hiển thị Macro',
            'GLOBAL' => [
                'LABEL' => 'Công khai',
                'DESCRIPTION' => 'Macro này có sẵn công khai cho tất cả các tác nhân trong tài khoản này.',
                'CREATE_DISABLED_DESCRIPTION' => 'Chỉ quản trị viên mới tạo được macro dùng chung.',
                'EDIT_DISABLED_DESCRIPTION' => 'Chỉ quản trị viên mới sửa được macro dùng chung.',
            ],
            'PERSONAL' => [
                'LABEL' => 'Riêng tư',
                'DESCRIPTION' => 'Macro này sẽ là riêng tư đối với bạn và không có sẵn đối với những người khác.',
            ],
        ],
    ],
    'EXECUTE' => [
        'BUTTON_TOOLTIP' => 'Thực thi',
        'PREVIEW' => 'Xem trước Macro',
        'EXECUTED_SUCCESSFULLY' => 'Macro được thực thi thành công',
        'EXECUTED_WITHOUT_RESOLVING' => 'Đã chạy macro. Hội thoại chưa được đánh dấu xử lý xong vì còn thiếu thuộc tính bắt buộc.',
    ],
    'ERRORS' => [
        'ATTRIBUTE_KEY_REQUIRED' => 'Khóa thuộc tính là bắt buộc',
        'FILTER_OPERATOR_REQUIRED' => 'Toán tử lọc là bắt buộc',
        'VALUE_REQUIRED' => 'Giá trị bắt buộc có',
        'VALUE_MUST_BE_BETWEEN_1_AND_998' => 'Giá trị phải nằm trong khoảng 1 đến 998',
        'ACTION_PARAMETERS_REQUIRED' => 'Tham số của hành động là bắt buộc',
        'ATLEAST_ONE_CONDITION_REQUIRED' => 'Cần ít nhất một điều kiện',
        'ATLEAST_ONE_ACTION_REQUIRED' => 'Cần ít nhất một hành động',
    ],
    'ACTIONS' => [
        'ASSIGN_TEAM' => 'Giao cho một nhóm',
        'ASSIGN_AGENT' => 'Giao cho một nhân viên',
        'ADD_LABEL' => 'Gắn một nhãn',
        'REMOVE_LABEL' => 'Gỡ một nhãn',
        'REMOVE_ASSIGNED_AGENT' => 'Bỏ nhân viên đang phụ trách',
        'REMOVE_ASSIGNED_TEAM' => 'Bỏ nhóm đang phụ trách',
        'SEND_EMAIL_TRANSCRIPT' => 'Gửi bản ghi hội thoại qua email',
        'MUTE_CONVERSATION' => 'Tắt tiếng hội thoại',
        'SNOOZE_CONVERSATION' => 'Tạm dừng hội thoại',
        'RESOLVE_CONVERSATION' => 'Giải quyết hội thoại',
        'CHANGE_STATUS' => 'Đổi trạng thái',
        'SEND_ATTACHMENT' => 'Gửi tệp đính kèm',
        'SEND_MESSAGE' => 'Gửi một tin nhắn',
        'SEND_CANNED_CARD' => 'Gửi thẻ từ câu trả lời mẫu',
        'CHANGE_PRIORITY' => 'Đổi mức ưu tiên',
        'ADD_PRIVATE_NOTE' => 'Thêm một ghi chú riêng',
        'SEND_WEBHOOK_EVENT' => 'Gửi sự kiện webhook',
    ],
    'PRIORITY_TYPES' => [
        'NONE' => 'Không có',
        'LOW' => 'Thấp',
        'MEDIUM' => 'Trung bình',
        'HIGH' => 'Cao',
        'URGENT' => 'Cấp bách',
    ],
];

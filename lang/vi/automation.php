<?php

// Bản dịch tiếng Việt của lang/en/automation.php.
// Nguồn: bản dịch `vi` của Chatwoot v4.17.1 (dashboard/widget/survey + config/locales/vi.yml);
// khóa Chatwoot chưa dịch và khóa riêng Yona được dịch mới trong đợt G3.

return [
    'system_name' => 'Hệ thống tự động hóa',
    'HEADER' => 'Tự động hóa',
    'DESCRIPTION' => 'Tự động hóa thay thế và rút gọn những việc tay chân lặp đi lặp lại như gắn nhãn hay giao hội thoại cho đúng nhân viên. Nhờ vậy cả đội tập trung vào thế mạnh của mình và bớt thời gian cho việc vặt.',
    'LEARN_MORE' => 'Tìm hiểu thêm về tự động hóa',
    'COUNT' => '{n} quy tắc tự động hóa | {n} quy tắc tự động hóa',
    'HEADER_BTN_TXT' => 'Tạo tự động hóa',
    'LOADING' => 'Đang lấy quy tắc tự động hóa',
    'SEARCH_PLACEHOLDER' => 'Tìm quy tắc tự động hóa...',
    'NO_RESULTS' => 'Không tìm thấy quy tắc tự động hóa nào khớp',
    'ADD' => [
        'TITLE' => 'Thêm quy tắc tự động hóa',
        'SUBMIT' => 'Tạo',
        'CANCEL_BUTTON_TEXT' => 'Huỷ',
        'FORM' => [
            'NAME' => [
                'LABEL' => 'Tên quy tắc',
                'PLACEHOLDER' => 'Nhập tên quy tắc',
                'ERROR' => 'Cần phải có tên',
            ],
            'DESC' => [
                'LABEL' => 'Mô tả',
                'PLACEHOLDER' => 'Nhập mô tả quy tắc',
                'ERROR' => 'Cần phải có mô tả',
            ],
            'EVENT' => [
                'LABEL' => 'Sự kiện',
                'PLACEHOLDER' => 'Vui lòng chọn một',
                'ERROR' => 'Cần phải có sự kiện',
            ],
            'RUN_TYPE' => [
                'LABEL' => 'Khi nào quy tắc này chạy?',
                'OPTIONS' => [
                    'INSTANT' => [
                        'LABEL' => 'Chạy ngay',
                        'DESCRIPTION' => 'Chạy ngay khi có sự kiện, miễn là điều kiện khớp.',
                    ],
                    'WAIT' => [
                        'LABEL' => 'Chạy sau một khoảng chờ',
                        'DESCRIPTION' => 'Chờ một khoảng thời gian rồi chỉ chạy nếu mọi thứ vẫn như cũ. Nếu có thay đổi, quy tắc bị bỏ qua.',
                    ],
                ],
            ],
            'WAIT' => [
                'LABEL' => 'Điều kiện chờ',
                'WHEN_LABEL' => 'Khi',
                'STATUS_LABEL' => 'Trạng thái là',
                'FOR_LABEL' => 'For',
                'INBOX_LABEL' => 'Hộp thư',
                'ERROR' => 'Khoảng chờ phải từ 10 phút đến 30 ngày',
                'OPTIONS' => [
                    'CONVERSATION_STATUS' => 'Hội thoại giữ nguyên một trạng thái',
                    'CUSTOMER_UNRESPONSIVE' => 'Khách chưa trả lời',
                    'AGENT_UNRESPONSIVE' => 'Chưa đồng đội nào trả lời',
                ],
                'DURATION' => [
                    'MINUTES' => '{count} phút | {count} phút',
                    'HOURS' => '{count} giờ | {count} giờ',
                    'DAYS' => '{count} ngày | {count} ngày',
                ],
                'EXPLANATION' => [
                    'CONVERSATION_STATUS' => 'Đồng hồ bắt đầu chạy khi hội thoại chuyển sang trạng thái này. Nếu sau {duration} vẫn ở đó, các hành động bên dưới sẽ chạy. Nếu trạng thái đổi trước đó thì không có gì xảy ra.',
                    'CUSTOMER_UNRESPONSIVE' => 'Đồng hồ bắt đầu chạy khi một đồng đội trả lời. Nếu sau {duration} khách vẫn chưa hồi âm, các hành động bên dưới sẽ chạy. Nếu khách trả lời thì không có gì xảy ra, và lần đồng đội trả lời kế tiếp sẽ tính lại từ đầu.',
                    'AGENT_UNRESPONSIVE' => 'Đồng hồ bắt đầu chạy khi khách gửi tin nhắn. Nếu sau {duration} chưa đồng đội nào trả lời, các hành động bên dưới sẽ chạy. Nếu có người trả lời trước đó thì không có gì xảy ra.',
                ],
                'FOOTNOTE' => 'Chỉ hoạt động mới bắt đầu tính giờ. Những hội thoại đang nằm sẵn ở trạng thái này sẽ được tính vào lần kế tiếp có việc gì xảy ra với chúng.',
            ],
            'CONDITIONS' => [
                'LABEL' => 'Điều kiện',
            ],
            'ACTIONS' => [
                'LABEL' => 'Hành động',
            ],
        ],
        'CONDITION_BUTTON_LABEL' => 'Thêm Điều kiện',
        'ACTION_BUTTON_LABEL' => 'Thêm Hành động',
        'API' => [
            'SUCCESS_MESSAGE' => 'Quy tắc tự động hóa thêm thành công',
            'ERROR_MESSAGE' => 'Không thể tạo quy tắc tự động hóa, Vui lòng thử lại sau',
        ],
    ],
    'LIST' => [
        'TABLE_HEADER' => [
            'NAME' => 'Tên',
            'ACTIVE' => 'Đang bật',
            'CREATED_ON' => 'Ngày tạo',
            'ACTIONS' => 'Hành động',
        ],
        '404' => 'Không tìm thấy quy tắc tự động hóa',
        '404_DELAYED' => 'Chưa có quy tắc nào chạy sau một khoảng chờ',
        'TABS' => [
            'INSTANT' => 'Chạy ngay',
            'DELAYED' => 'Chạy sau một khoảng chờ',
        ],
        'DELAY_BADGE' => 'Chạy sau {delay}',
        'DELAY_DISABLED_BANNER' => 'Tài khoản này đang tắt chế độ chạy trễ, nên các quy tắc chạy sau một khoảng chờ bên dưới đang tạm dừng cho tới khi bật lại.',
    ],
    'DELETE' => [
        'CONFIRM' => [
            'TITLE' => 'Xác nhận xoá',
            'MESSAGE' => 'Bạn có chắc muốn xoá ',
            'YES' => 'Có, xoá ',
            'NO' => 'Không, giữ ',
        ],
        'API' => [
            'SUCCESS_MESSAGE' => 'Quy tắc tự động hóa được xoá thành công',
            'ERROR_MESSAGE' => 'Không thể xoá quy tắc tự động hóa, Vui lòng thử lại sau',
        ],
    ],
    'EDIT' => [
        'TITLE' => 'Sửa quy tắc tự động hóa',
        'SUBMIT' => 'Cập nhật',
        'CANCEL_BUTTON_TEXT' => 'Huỷ',
        'API' => [
            'SUCCESS_MESSAGE' => 'Quy tắc tự động hóa được thêm thành công',
            'ERROR_MESSAGE' => 'Không thể cập nhật quy tắc tự động hóa, Vui lòng thử lại sau',
        ],
    ],
    'CLONE' => [
        'TOOLTIP' => 'Nhân bản',
        'API' => [
            'SUCCESS_MESSAGE' => 'Quy tắc tự động hóa mô phỏng thành công',
            'ERROR_MESSAGE' => 'Không thể mô phỏng quy tắc tự động hóa, Vui lòng thử lại sau',
        ],
    ],
    'FORM' => [
        'EDIT' => 'Chỉnh sửa',
        'CREATE' => 'Tạo',
        'DELETE' => 'Xoá',
        'CANCEL' => 'Huỷ',
        'RESET_MESSAGE' => 'Thay đổi loại sự kiện sẽ đặt lại điều kiện và sự kiện mà bạn đã thêm bên dưới',
    ],
    'CONDITION' => [
        'DELETE_MESSAGE' => 'Bạn cần có ít nhất một điều kiện để lưu',
        'CONTACT_CUSTOM_ATTR_LABEL' => 'Thuộc tính Liên hệ Tùy chỉnh',
        'CONVERSATION_CUSTOM_ATTR_LABEL' => 'Tùy chỉnh Thuộc tính hội thoại',
    ],
    'ACTION' => [
        'DELETE_MESSAGE' => 'Bạn cần có ít nhất một hành động để lưu',
        'TEAM_MESSAGE_INPUT_PLACEHOLDER' => 'Viết tin nhắn ở đây',
        'TEAM_DROPDOWN_PLACEHOLDER' => 'Chọn nhóm',
        'EMAIL_INPUT_PLACEHOLDER' => 'Nhập email',
        'URL_INPUT_PLACEHOLDER' => 'Nhập URL',
        'INSERT_CONTACT_EMAIL' => 'Dùng email của liên hệ',
    ],
    'TOGGLE' => [
        'ACTIVATION_TITLE' => 'Kích hoạt quy tắc tự động hóa',
        'DEACTIVATION_TITLE' => 'Vô hiệu hóa quy tắc tự động hóa',
        'ACTIVATION_DESCRIPTION' => 'Thao tác này sẽ kích hoạt quy tắc tự động hóa tên \'{automationName}\'. Bạn có chắc là muốn tiếp tục?',
        'DEACTIVATION_DESCRIPTION' => 'Thao tác này sẽ vô hiệu hóa quy tắc tự động hóa tên \'{automationName}\'. Bạn có chắc là muốn tiếp tục?',
        'CONFIRMATION_LABEL' => 'Có',
        'CANCEL_LABEL' => 'Không',
    ],
    'EVENTS' => [
        'CONVERSATION_CREATED' => 'Hội thoại đã được tạo',
        'CONVERSATION_UPDATED' => 'Hội thoại đã được cập nhật',
        'MESSAGE_CREATED' => 'Có tin nhắn mới',
        'CONVERSATION_RESOLVED' => 'Hội thoại đã xử lý xong',
        'CONVERSATION_OPENED' => 'Hội thoại được mở',
    ],
    'ACTIONS' => [
        'ASSIGN_AGENT' => 'Giao cho nhân viên',
        'ASSIGN_TEAM' => 'Giao cho một nhóm',
        'REMOVE_ASSIGNED_AGENT' => 'Bỏ nhân viên đang phụ trách',
        'REMOVE_ASSIGNED_TEAM' => 'Bỏ nhóm đang phụ trách',
        'ADD_LABEL' => 'Gắn một nhãn',
        'REMOVE_LABEL' => 'Gỡ một nhãn',
        'SEND_EMAIL_TO_TEAM' => 'Gửi email cho nhóm',
        'SEND_MESSAGE' => 'Gửi một tin nhắn',
        'ADD_PRIVATE_NOTE' => 'Thêm một ghi chú riêng',
        'MUTE_CONVERSATION' => 'Tắt tiếng hội thoại',
        'SNOOZE_CONVERSATION' => 'Tạm dừng hội thoại',
        'OPEN_CONVERSATION' => 'Mở hội thoại',
        'PENDING_CONVERSATION' => 'Đánh dấu hội thoại là đang chờ',
        'RESOLVE_CONVERSATION' => 'Giải quyết hội thoại',
        'CHANGE_PRIORITY' => 'Đổi mức ưu tiên',
    ],
    'ATTRIBUTES' => [
        'MESSAGE_TYPE' => 'Loại tin nhắn',
        'PRIVATE_NOTE' => 'Lưu ý riêng',
        'MESSAGE_CONTAINS' => 'Message Contains',
        'EMAIL' => 'Email',
        'INBOX' => 'Hộp thư',
        'CONVERSATION_LANGUAGE' => 'Ngôn ngữ hội thoại',
        'PHONE_NUMBER' => 'Số điện thoại',
        'STATUS' => 'Trạng thái',
        'BROWSER_LANGUAGE' => 'Ngôn ngữ của Trình duyệt',
        'MAIL_SUBJECT' => 'Tiêu đề email',
        'COUNTRY_NAME' => 'Quốc gia',
        'COMPANY_NAME' => 'Công ty',
        'REFERER_LINK' => 'Liên kết nguồn',
        'ASSIGNEE_NAME' => 'Người phụ trách',
        'TEAM_NAME' => 'Nhóm',
        'PRIORITY' => 'Mức độ ưu tiên',
        'LABELS' => 'Nhãn',
    ],
    'NONE_OPTION' => 'Không có',
    'LAST_RESPONDING_AGENT' => 'Nhân viên trả lời gần nhất',
    'MESSAGE_TYPES' => [
        'INCOMING' => 'Tin nhắn đến',
        'OUTGOING' => 'Tin nhắn đi',
    ],
    'PRIORITY_TYPES' => [
        'NONE' => 'Không có',
        'LOW' => 'Thấp',
        'MEDIUM' => 'Trung bình',
        'HIGH' => 'Cao',
        'URGENT' => 'Cấp bách',
    ],
    'ERRORS' => [
        'VALUE_REQUIRED' => 'Giá trị bắt buộc có',
        'ACTION_PARAMETERS_REQUIRED' => 'Tham số của hành động là bắt buộc',
        'ATLEAST_ONE_CONDITION_REQUIRED' => 'Cần ít nhất một điều kiện',
        'ATLEAST_ONE_ACTION_REQUIRED' => 'Cần ít nhất một hành động',
    ],
];

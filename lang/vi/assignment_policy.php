<?php

// Bản dịch tiếng Việt của lang/en/assignment_policy.php.
// Nguồn: bản dịch `vi` của Chatwoot v4.17.1 (dashboard/widget/survey + config/locales/vi.yml);
// khóa Chatwoot chưa dịch và khóa riêng Yona được dịch mới trong đợt G3.

return [
    'INDEX' => [
        'HEADER' => [
            'TITLE' => 'Phân công nhân viên',
            'DESCRIPTION' => 'Đặt ra chính sách để quản lý khối lượng việc và điều hướng hội thoại theo nhu cầu của từng hộp thư và từng nhân viên. Tìm hiểu thêm tại đây',
        ],
        'ASSIGNMENT_POLICY' => [
            'TITLE' => 'Chính sách phân công',
            'DESCRIPTION' => 'Quản lý cách hội thoại được giao trong các hộp thư.',
            'FEATURES' => [
                'Chia hội thoại đều nhau hoặc theo sức chứa còn trống',
                'Thêm quy tắc chia việc công bằng để không nhân viên nào bị quá tải',
                'Thêm hộp thư vào chính sách — mỗi hộp thư một chính sách',
            ],
        ],
        'AGENT_CAPACITY_POLICY' => [
            'TITLE' => 'Chính sách sức chứa nhân viên',
            'DESCRIPTION' => 'Quản lý khối lượng việc của nhân viên.',
            'FEATURES' => [
                'Đặt số hội thoại tối đa cho mỗi hộp thư',
                'Tạo ngoại lệ theo nhãn và theo thời gian',
                'Thêm nhân viên vào chính sách — mỗi nhân viên một chính sách',
            ],
        ],
    ],
    'AGENT_ASSIGNMENT_POLICY' => [
        'INDEX' => [
            'HEADER' => [
                'TITLE' => 'Chính sách phân công',
                'CREATE_POLICY' => 'Chính sách mới',
            ],
            'CARD' => [
                'ORDER' => 'Thứ tự',
                'PRIORITY' => 'Mức độ ưu tiên',
                'ACTIVE' => 'Đang bật',
                'INACTIVE' => 'Đang tắt',
                'POPOVER' => 'Hộp thư đã thêm',
                'EDIT' => 'Chỉnh sửa',
            ],
            'NO_RECORDS_FOUND' => 'Chưa có chính sách phân công nào',
        ],
        'CREATE' => [
            'HEADER' => [
                'TITLE' => 'Tạo chính sách phân công',
            ],
            'CREATE_BUTTON' => 'Tạo chính sách',
            'API' => [
                'SUCCESS_MESSAGE' => 'Đã tạo chính sách phân công',
                'ERROR_MESSAGE' => 'Tạo chính sách phân công thất bại',
                'INBOX_LINKED' => 'Đã gắn hộp thư vào chính sách',
            ],
        ],
        'EDIT' => [
            'HEADER' => [
                'TITLE' => 'Sửa chính sách phân công',
            ],
            'EDIT_BUTTON' => 'Cập nhật chính sách',
            'CONFIRM_ADD_INBOX_DIALOG' => [
                'TITLE' => 'Thêm hộp thư',
                'DESCRIPTION' => 'Hộp thư {inboxName} đang gắn với một chính sách khác. Bạn chắc chắn muốn gắn nó vào chính sách này? Hộp thư sẽ được gỡ khỏi chính sách kia.',
                'CONFIRM_BUTTON_LABEL' => 'Tiếp tục',
                'CANCEL_BUTTON_LABEL' => 'Huỷ',
            ],
            'INBOX_LINK_PROMPT' => [
                'TITLE' => 'Gắn hộp thư vào chính sách',
                'DESCRIPTION' => 'Bạn có muốn gắn hộp thư này vào chính sách phân công không?',
                'LINK_BUTTON' => 'Gắn hộp thư',
                'CANCEL_BUTTON' => 'Bỏ qua',
            ],
            'API' => [
                'SUCCESS_MESSAGE' => 'Đã cập nhật chính sách phân công',
                'ERROR_MESSAGE' => 'Cập nhật chính sách phân công thất bại',
            ],
            'INBOX_API' => [
                'ADD' => [
                    'SUCCESS_MESSAGE' => 'Đã thêm hộp thư vào chính sách',
                    'ERROR_MESSAGE' => 'Thêm hộp thư vào chính sách thất bại',
                ],
                'REMOVE' => [
                    'SUCCESS_MESSAGE' => 'Đã gỡ hộp thư khỏi chính sách',
                    'ERROR_MESSAGE' => 'Gỡ hộp thư khỏi chính sách thất bại',
                ],
            ],
        ],
        'FORM' => [
            'NAME' => [
                'LABEL' => 'Tên chính sách:',
                'PLACEHOLDER' => 'Nhập tên chính sách',
            ],
            'DESCRIPTION' => [
                'LABEL' => 'Mô tả:',
                'PLACEHOLDER' => 'Nhập mô tả',
            ],
            'STATUS' => [
                'LABEL' => 'Trạng thái:',
                'PLACEHOLDER' => 'Chọn trạng thái',
                'ACTIVE' => 'Chính sách đang bật',
                'INACTIVE' => 'Chính sách đang tắt',
            ],
            'ASSIGNMENT_ORDER' => [
                'LABEL' => 'Thứ tự phân công',
                'ROUND_ROBIN' => [
                    'LABEL' => 'Chia lần lượt',
                    'DESCRIPTION' => 'Giao hội thoại đều nhau cho các nhân viên.',
                ],
                'BALANCED' => [
                    'LABEL' => 'Cân bằng',
                    'DESCRIPTION' => 'Giao hội thoại theo sức chứa còn trống.',
                    'PREMIUM_MESSAGE' => 'Hãy nâng cấp để dùng phân công cân bằng và quản lý sức chứa nhân viên.',
                    'PREMIUM_BADGE' => 'Premium',
                ],
            ],
            'ASSIGNMENT_PRIORITY' => [
                'LABEL' => 'Ưu tiên phân công',
                'EARLIEST_CREATED' => [
                    'LABEL' => 'Tạo sớm nhất',
                    'DESCRIPTION' => 'Hội thoại tạo trước được giao trước.',
                ],
                'LONGEST_WAITING' => [
                    'LABEL' => 'Chờ lâu nhất',
                    'DESCRIPTION' => 'Hội thoại chờ lâu nhất được giao trước.',
                ],
            ],
            'FAIR_DISTRIBUTION' => [
                'LABEL' => 'Chính sách chia việc công bằng',
                'DESCRIPTION' => 'Set the maximum number of conversations that can be assigned per agent within a time window to avoid overloading any one agent. This required field defaults to 100 conversations per hour.',
                'INPUT_MAX' => 'Giao tối đa',
                'DURATION' => 'hội thoại cho mỗi nhân viên trong mỗi',
            ],
            'EXCLUDE_OLDER_THAN' => [
                'LABEL' => 'Bỏ qua hội thoại quá cũ',
                'DESCRIPTION' => 'Bỏ qua hội thoại chưa ai nhận mà cũ hơn mốc này. Mặc định 7 ngày; xóa trống để tắt.',
            ],
            'INBOXES' => [
                'LABEL' => 'Hộp thư đã thêm',
                'DESCRIPTION' => 'Thêm những hộp thư sẽ áp dụng chính sách này.',
                'ADD_BUTTON' => 'Thêm hộp thư',
                'DROPDOWN' => [
                    'SEARCH_PLACEHOLDER' => 'Tìm và chọn hộp thư để thêm',
                    'ADD_BUTTON' => 'Thêm',
                ],
                'EMPTY_STATE' => 'Chưa có hộp thư nào trong chính sách này, hãy thêm một hộp thư để bắt đầu',
                'API' => [
                    'SUCCESS_MESSAGE' => 'Đã thêm hộp thư vào chính sách',
                    'ERROR_MESSAGE' => 'Thêm hộp thư vào chính sách thất bại',
                ],
            ],
        ],
        'DELETE_POLICY' => [
            'SUCCESS_MESSAGE' => 'Đã xóa chính sách phân công',
            'ERROR_MESSAGE' => 'Xóa chính sách phân công thất bại',
        ],
    ],
    'AGENT_CAPACITY_POLICY' => [
        'INDEX' => [
            'HEADER' => [
                'TITLE' => 'Sức chứa nhân viên',
                'CREATE_POLICY' => 'Chính sách mới',
            ],
            'CARD' => [
                'POPOVER' => 'Nhân viên đã thêm',
                'EDIT' => 'Chỉnh sửa',
            ],
            'NO_RECORDS_FOUND' => 'Chưa có chính sách sức chứa nhân viên nào',
        ],
        'CREATE' => [
            'HEADER' => [
                'TITLE' => 'Tạo chính sách sức chứa nhân viên',
            ],
            'CREATE_BUTTON' => 'Tạo chính sách',
            'API' => [
                'SUCCESS_MESSAGE' => 'Đã tạo chính sách sức chứa nhân viên',
                'ERROR_MESSAGE' => 'Tạo chính sách sức chứa nhân viên thất bại',
            ],
        ],
        'EDIT' => [
            'HEADER' => [
                'TITLE' => 'Sửa chính sách sức chứa nhân viên',
            ],
            'EDIT_BUTTON' => 'Cập nhật chính sách',
            'CONFIRM_ADD_AGENT_DIALOG' => [
                'TITLE' => 'Thêm nhân viên',
                'DESCRIPTION' => '{agentName} đang gắn với một chính sách khác. Bạn chắc chắn muốn gắn vào chính sách này? Nhân viên sẽ được gỡ khỏi chính sách kia.',
                'CONFIRM_BUTTON_LABEL' => 'Tiếp tục',
                'CANCEL_BUTTON_LABEL' => 'Huỷ',
            ],
            'API' => [
                'SUCCESS_MESSAGE' => 'Đã cập nhật chính sách sức chứa nhân viên',
                'ERROR_MESSAGE' => 'Cập nhật chính sách sức chứa nhân viên thất bại',
            ],
            'AGENT_API' => [
                'ADD' => [
                    'SUCCESS_MESSAGE' => 'Đã thêm nhân viên vào chính sách',
                    'ERROR_MESSAGE' => 'Thêm nhân viên vào chính sách thất bại',
                ],
                'REMOVE' => [
                    'SUCCESS_MESSAGE' => 'Đã gỡ nhân viên khỏi chính sách',
                    'ERROR_MESSAGE' => 'Gỡ nhân viên khỏi chính sách thất bại',
                ],
            ],
            'INBOX_LIMIT_API' => [
                'ADD' => [
                    'SUCCESS_MESSAGE' => 'Đã thêm hạn mức hộp thư',
                    'ERROR_MESSAGE' => 'Thêm hạn mức hộp thư thất bại',
                ],
                'UPDATE' => [
                    'SUCCESS_MESSAGE' => 'Đã cập nhật hạn mức hộp thư',
                    'ERROR_MESSAGE' => 'Cập nhật hạn mức hộp thư thất bại',
                ],
                'DELETE' => [
                    'SUCCESS_MESSAGE' => 'Đã xóa hạn mức hộp thư',
                    'ERROR_MESSAGE' => 'Xóa hạn mức hộp thư thất bại',
                ],
            ],
        ],
        'FORM' => [
            'NAME' => [
                'LABEL' => 'Tên chính sách:',
                'PLACEHOLDER' => 'Nhập tên chính sách',
            ],
            'DESCRIPTION' => [
                'LABEL' => 'Mô tả:',
                'PLACEHOLDER' => 'Nhập mô tả',
            ],
            'INBOX_CAPACITY_LIMIT' => [
                'LABEL' => 'Hạn mức sức chứa theo hộp thư',
                'ADD_BUTTON' => 'Thêm hộp thư',
                'FIELD' => [
                    'SELECT_INBOX' => 'Chọn hộp thư',
                    'MAX_CONVERSATIONS' => 'Số hội thoại tối đa',
                    'SET_LIMIT' => 'Đặt hạn mức',
                ],
                'EMPTY_STATE' => 'Chưa đặt hạn mức hộp thư nào',
            ],
            'EXCLUSION_RULES' => [
                'LABEL' => 'Quy tắc loại trừ',
                'DESCRIPTION' => 'Hội thoại thỏa các điều kiện sau sẽ không tính vào sức chứa của nhân viên',
                'TAGS' => [
                    'LABEL' => 'Loại trừ hội thoại có gắn nhãn nhất định',
                    'ADD_TAG' => 'add tag',
                    'DROPDOWN' => [
                        'SEARCH_PLACEHOLDER' => 'Tìm và chọn nhãn để thêm',
                    ],
                    'EMPTY_STATE' => 'Chính sách này chưa có nhãn nào.',
                ],
                'DURATION' => [
                    'LABEL' => 'Loại trừ hội thoại cũ hơn một khoảng thời gian',
                    'PLACEHOLDER' => 'Đặt thời gian',
                ],
            ],
            'USERS' => [
                'LABEL' => 'Nhân viên được gán',
                'DESCRIPTION' => 'Thêm những nhân viên sẽ áp dụng chính sách này.',
                'ADD_BUTTON' => 'Thêm nhân viên',
                'DROPDOWN' => [
                    'SEARCH_PLACEHOLDER' => 'Tìm và chọn nhân viên để thêm',
                    'ADD_BUTTON' => 'Thêm',
                ],
                'EMPTY_STATE' => 'Chưa thêm nhân viên nào',
                'API' => [
                    'SUCCESS_MESSAGE' => 'Đã thêm nhân viên vào chính sách',
                    'ERROR_MESSAGE' => 'Thêm nhân viên vào chính sách thất bại',
                ],
            ],
        ],
        'DELETE_POLICY' => [
            'SUCCESS_MESSAGE' => 'Đã xóa chính sách sức chứa nhân viên',
            'ERROR_MESSAGE' => 'Xóa chính sách sức chứa nhân viên thất bại',
        ],
    ],
    'DELETE_POLICY' => [
        'TITLE' => 'Xóa chính sách',
        'DESCRIPTION' => 'Bạn chắc chắn muốn xóa chính sách này? Không thể hoàn tác.',
        'CONFIRM_BUTTON_LABEL' => 'Xoá',
        'CANCEL_BUTTON_LABEL' => 'Huỷ',
    ],
];

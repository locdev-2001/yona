<?php

// Bản dịch tiếng Việt của lang/en/contacts_layout.php.

return [
    'HEADER' => [
        'TITLE' => 'Liên hệ',
        'SEARCH_TITLE' => 'Tìm kiếm liên hệ',
        'ACTIVE_TITLE' => 'Liên hệ đang hoạt động',
        'SEARCH_PLACEHOLDER' => 'Tìm kiếm...',
        'MESSAGE_BUTTON' => 'Tin nhắn',
        'SEND_MESSAGE' => 'Gửi tin nhắn',
        'BLOCK_CONTACT' => 'Chặn liên hệ',
        'UNBLOCK_CONTACT' => 'Bỏ chặn liên hệ',
        'BREADCRUMB' => [
            'CONTACTS' => 'Liên hệ',
        ],
        'ACTIONS' => [
            'CONTACT_CREATION' => [
                'ADD_CONTACT' => 'Thêm liên hệ',
                'EXPORT_CONTACT' => 'Xuất liên hệ',
                'IMPORT_CONTACT' => 'Nhập liên hệ',
                'SAVE_CONTACT' => 'Lưu liên hệ',
                'EMAIL_ADDRESS_DUPLICATE' => 'Địa chỉ email này đang được sử dụng cho một liên hệ khác.',
                'PHONE_NUMBER_DUPLICATE' => 'Số điện thoại này đang được dùng cho một liên hệ khác.',
                'SUCCESS_MESSAGE' => 'Liên hệ được lưu thành công',
                'ERROR_MESSAGE' => 'Không lưu được liên hệ. Bạn hãy thử lại sau.',
            ],
            'BLOCK_SUCCESS_MESSAGE' => 'Đã chặn liên hệ này',
            'BLOCK_ERROR_MESSAGE' => 'Không chặn được liên hệ. Bạn hãy thử lại sau.',
            'UNBLOCK_SUCCESS_MESSAGE' => 'Đã bỏ chặn liên hệ này',
            'UNBLOCK_ERROR_MESSAGE' => 'Không bỏ chặn được liên hệ. Bạn hãy thử lại sau.',
            'IMPORT_CONTACT' => [
                'TITLE' => 'Nhập liên hệ',
                'DESCRIPTION' => 'Nhập liên hệ bằng một file CSV.',
                'DOWNLOAD_LABEL' => 'Tải xuống tệp CSV mẫu.',
                'LABEL' => 'Tệp CSV:',
                'CHOOSE_FILE' => 'Chọn tệp',
                'CHANGE' => 'Đổi',
                'CANCEL' => 'Huỷ',
                'IMPORT' => 'Nhập',
                'SUCCESS_MESSAGE' => 'Chúng tôi sẽ gửi email báo cho bạn khi nhập xong.',
                'ERROR_MESSAGE' => 'Đã có lỗi, vui lòng thử lại',
                'STATUS' => [
                    'PENDING' => 'Đang chờ tới lượt nhập...',
                    'PROCESSING' => 'Đang nhập liên hệ...',
                    'COMPLETED' => 'Đã nhập {processed} trên {total} dòng.',
                    'FAILED' => 'Nhập liên hệ thất bại.',
                ],
                'DOWNLOAD_FAILED_RECORDS' => 'Tải về những dòng không nhập được',
            ],
            'EXPORT_CONTACT' => [
                'TITLE' => 'Xuất liên hệ',
                'DESCRIPTION' => 'Xuất nhanh một tệp csv chứa đầy đủ thông tin liên hệ của bạn',
                'CONFIRM' => 'Xuất',
                'SUCCESS_MESSAGE' => 'Export is in progress, You will be notified via email when export file is ready to dowanlod.',
                'ERROR_MESSAGE' => 'Đã có lỗi, vui lòng thử lại',
            ],
            'SORT_BY' => [
                'LABEL' => 'Sắp bởi',
                'OPTIONS' => [
                    'NAME' => 'Tên',
                    'EMAIL' => 'Email',
                    'PHONE_NUMBER' => 'Số điện thoại',
                    'COMPANY' => 'Công ty',
                    'COUNTRY' => 'Quốc gia',
                    'CITY' => 'Tỉnh / Thành phố',
                    'LAST_ACTIVITY' => 'Hành động cuối cùng',
                    'CREATED_AT' => 'Tạo vào lúc',
                ],
            ],
            'ORDER' => [
                'LABEL' => 'Sắp xếp',
                'OPTIONS' => [
                    'ASCENDING' => 'Tăng dần',
                    'DESCENDING' => 'Giảm dần',
                ],
            ],
            'FILTERS' => [
                'CREATE_SEGMENT' => [
                    'TITLE' => 'Bạn có muốn lưu bộ lọc này không?',
                    'CONFIRM' => 'Lưu bộ lọc',
                    'LABEL' => 'Tên',
                    'PLACEHOLDER' => 'Nhập tên của bộ lọc',
                    'ERROR' => 'Hãy nhập tên hợp lệ',
                    'SUCCESS_MESSAGE' => 'Đã lưu bộ lọc',
                    'ERROR_MESSAGE' => 'Không lưu được bộ lọc. Bạn hãy thử lại sau.',
                ],
                'DELETE_SEGMENT' => [
                    'TITLE' => 'Xác nhận xoá',
                    'DESCRIPTION' => 'Bạn chắc chắn muốn xóa bộ lọc này?',
                    'CONFIRM' => 'Có, Xoá',
                    'CANCEL' => 'Không, hủy',
                    'SUCCESS_MESSAGE' => 'Đã xóa bộ lọc',
                    'ERROR_MESSAGE' => 'Không xóa được bộ lọc. Bạn hãy thử lại sau.',
                ],
            ],
        ],
    ],
    'PAGINATION_FOOTER' => [
        'SHOWING' => 'Đang hiển thị {startItem} - {endItem} trong {totalItems} liên hệ',
    ],
    'FILTER' => [
        'NAME' => 'Tên',
        'EMAIL' => 'Email',
        'PHONE_NUMBER' => 'Số điện thoại',
        'IDENTIFIER' => 'Định danh',
        'COUNTRY' => 'Quốc gia',
        'CITY' => 'Tỉnh / Thành phố',
        'COMPANY' => 'Công ty',
        'CREATED_AT' => 'Tạo vào lúc',
        'LAST_ACTIVITY' => 'Hành động cuối cùng',
        'REFERER_LINK' => 'Liên kết người giới thiệu',
        'BLOCKED' => 'Đã chặn',
        'BLOCKED_TRUE' => 'Đúng',
        'BLOCKED_FALSE' => 'Sai',
        'BUTTONS' => [
            'CLEAR_FILTERS' => 'Xóa các bộ lọc',
            'UPDATE_SEGMENT' => 'Cập nhật nhóm khách',
            'APPLY_FILTERS' => 'Áp dụng bộ lọc',
            'ADD_FILTER' => 'Thêm bộ lọc',
        ],
        'TITLE' => 'Lọc liên hệ',
        'EDIT_SEGMENT' => 'Sửa bộ lọc',
        'SEGMENT' => [
            'LABEL' => 'Tên nhóm khách',
            'INPUT_PLACEHOLDER' => 'Nhập tên nhóm khách',
        ],
        'ACTIVE_FILTERS' => [
            'MORE_FILTERS' => '+ {count} bộ lọc nữa',
            'CLEAR_FILTERS' => 'Xóa các bộ lọc',
        ],
    ],
    'IDENTIFICATION' => [
        'ALL' => 'Tất cả',
        'IDENTIFIED' => 'Đã định danh',
        'UNIDENTIFIED' => 'Chưa định danh',
    ],
    'CARD' => [
        'OF' => 'của',
        'UNIDENTIFIED_BADGE' => 'Chưa định danh',
        'UNIDENTIFIED_HINT' => 'Chưa có email, số điện thoại hay mã định danh — hiện chỉ biết khách qua kênh nhắn tin.',
        'VIEW_DETAILS' => 'Xem chi tiết',
        'EDIT_DETAILS_FORM' => [
            'TITLE' => 'Chỉnh sửa liên hệ chi tiết',
            'FORM' => [
                'FIRST_NAME' => [
                    'PLACEHOLDER' => 'Nhập tên',
                ],
                'LAST_NAME' => [
                    'PLACEHOLDER' => 'Nhập họ',
                ],
                'EMAIL_ADDRESS' => [
                    'PLACEHOLDER' => 'Nhập địa chỉ email',
                    'DUPLICATE' => 'Địa chỉ email này đang được sử dụng cho một liên hệ khác.',
                ],
                'PHONE_NUMBER' => [
                    'PLACEHOLDER' => 'Nhập số điện thoại',
                    'DUPLICATE' => 'Số điện thoại này đang được dùng cho một liên hệ khác.',
                ],
                'CITY' => [
                    'PLACEHOLDER' => 'Nhập tên thành phố',
                ],
                'COUNTRY' => [
                    'PLACEHOLDER' => 'Chọn quốc gia',
                ],
                'BIO' => [
                    'PLACEHOLDER' => 'Nhập phần giới thiệu',
                ],
                'COMPANY_NAME' => [
                    'PLACEHOLDER' => 'Nhập tên công ty',
                ],
            ],
            'UPDATE_BUTTON' => 'Cập nhật liên hệ',
            'SUCCESS_MESSAGE' => 'Đã cập nhật liên hệ',
            'ERROR_MESSAGE' => 'Không cập nhật được liên hệ. Bạn hãy thử lại sau.',
        ],
        'SOCIAL_MEDIA' => [
            'TITLE' => 'Sửa liên kết mạng xã hội',
            'FORM' => [
                'FACEBOOK' => [
                    'PLACEHOLDER' => 'Thêm Facebook',
                ],
                'GITHUB' => [
                    'PLACEHOLDER' => 'Thêm Github',
                ],
                'INSTAGRAM' => [
                    'PLACEHOLDER' => 'Thêm Instagram',
                ],
                'TELEGRAM' => [
                    'PLACEHOLDER' => 'Thêm Telegram',
                ],
                'TIKTOK' => [
                    'PLACEHOLDER' => 'Thêm TikTok',
                ],
                'LINKEDIN' => [
                    'PLACEHOLDER' => 'Thêm LinkedIn',
                ],
                'TWITTER' => [
                    'PLACEHOLDER' => 'Thêm Twitter',
                ],
            ],
        ],
        'DELETE_CONTACT' => [
            'MESSAGE' => 'Thao tác này là vĩnh viễn, không thể hoàn tác.',
            'BUTTON' => 'Xóa ngay',
        ],
    ],
    'DETAILS' => [
        'CREATED_AT' => 'Tạo {date}',
        'LAST_ACTIVITY' => 'Hoạt động lần cuối {date}',
        'DELETE_CONTACT_DESCRIPTION' => 'Xóa vĩnh viễn liên hệ này. Không thể hoàn tác',
        'DELETE_CONTACT' => 'Xoá liên hệ',
        'DELETE_DIALOG' => [
            'TITLE' => 'Xác nhận xoá',
            'DESCRIPTION' => 'Bạn chắc chắn muốn xóa liên hệ này?',
            'CONFIRM' => 'Có, Xoá',
            'API' => [
                'SUCCESS_MESSAGE' => 'Liên hệ đã được xóa thành công',
                'ERROR_MESSAGE' => 'Không thể xoá liên hệ. Vui lòng thử lại sau.',
            ],
        ],
        'AVATAR' => [
            'UPLOAD' => [
                'ERROR_MESSAGE' => 'Không tải được ảnh đại diện. Bạn hãy thử lại sau.',
                'SUCCESS_MESSAGE' => 'Đã tải ảnh đại diện lên',
            ],
            'DELETE' => [
                'SUCCESS_MESSAGE' => 'Hình đại diện đã được xóa thành công',
                'ERROR_MESSAGE' => 'Không xóa được ảnh đại diện. Bạn hãy thử lại sau.',
            ],
        ],
    ],
    'SIDEBAR' => [
        'TABS' => [
            'ATTRIBUTES' => 'Thuộc tính',
            'HISTORY' => 'Lịch sử',
            'NOTES' => 'Ghi chú',
            'MEDIA' => 'Tệp đính kèm',
            'MERGE' => 'Gộp',
        ],
        'HISTORY' => [
            'EMPTY_STATE' => 'Không có hội thoại trước đó được liên kết với liên hệ này',
        ],
        'ATTRIBUTES' => [
            'SEARCH_PLACEHOLDER' => 'Tìm thuộc tính',
            'UNUSED_ATTRIBUTES' => '{count} thuộc tính đang dùng | {count} thuộc tính chưa dùng',
            'EMPTY_STATE' => 'Tài khoản này chưa có thuộc tính tùy chỉnh nào cho liên hệ. Bạn có thể tạo trong phần cài đặt.',
            'YES' => 'Có',
            'NO' => 'Không',
            'TRIGGER' => [
                'SELECT' => 'Chọn giá trị',
                'INPUT' => 'Nhập giá trị',
            ],
            'VALIDATIONS' => [
                'INVALID_NUMBER' => 'Số không hợp lệ',
                'REQUIRED' => 'Giá trị hợp lệ bắt buộc có',
                'INVALID_INPUT' => 'Giá trị không hợp lệ',
                'INVALID_URL' => 'URL không hợp lệ',
                'INVALID_DATE' => 'Ngày không hợp lệ',
            ],
            'NO_ATTRIBUTES' => 'Không có thuộc tính nào được tìm thấy',
            'API' => [
                'SUCCESS_MESSAGE' => 'Thuộc tính được cập nhật thành công',
                'DELETE_SUCCESS_MESSAGE' => 'Thuộc tính được xoá thành công',
                'UPDATE_ERROR' => 'Không thể cập nhật thuộc tính. Vui lòng thử lại sau',
                'DELETE_ERROR' => 'Không thể xoá thuộc tính. Vui lòng thử lại sau',
            ],
        ],
        'MERGE' => [
            'TITLE' => 'Hợp nhất liên hệ',
            'DESCRIPTION' => 'Gộp hai hồ sơ thành một, gồm mọi thuộc tính và hội thoại. Nếu có xung đột, thuộc tính của liên hệ chính được ưu tiên.',
            'PRIMARY' => 'Liên hệ chính',
            'PRIMARY_HELP_LABEL' => 'Sẽ được giữ lại',
            'PRIMARY_REQUIRED_ERROR' => 'Bạn hãy chọn một liên hệ để gộp trước khi tiếp tục',
            'PARENT' => 'Sẽ được gộp vào',
            'PARENT_HELP_LABEL' => 'Sẽ được xoá',
            'EMPTY_STATE' => 'Không tìm thấy liên hệ nào',
            'PLACEHOLDER' => 'Tìm liên hệ chính',
            'SEARCH_PLACEHOLDER' => 'Tìm kiếm liên hệ',
            'SEARCH_ERROR_MESSAGE' => 'Không tìm được liên hệ. Bạn hãy thử lại sau.',
            'SUCCESS_MESSAGE' => 'Liên hệ được gộp thành công',
            'ERROR_MESSAGE' => 'Không thể hợp nhất liên lạc, thử lại!',
            'IS_SEARCHING' => 'Đang tìm kiếm...',
            'BUTTONS' => [
                'CANCEL' => 'Huỷ',
                'CONFIRM' => 'Hợp nhất liên hệ',
            ],
        ],
        'NOTES' => [
            'PLACEHOLDER' => 'Thêm ghi chú',
            'WROTE' => 'đã viết',
            'YOU' => 'Bạn',
            'SAVE' => 'Lưu ghi chú',
            'ADD_NOTE' => 'Thêm ghi chú cho liên hệ',
            'EXPAND' => 'Mở rộng',
            'COLLAPSE' => 'Thu gọn',
            'NO_NOTES' => 'Chưa có ghi chú nào, bạn có thể thêm ghi chú ở trang chi tiết liên hệ.',
            'EMPTY_STATE' => 'Liên hệ này chưa có ghi chú nào. Bạn có thể thêm ghi chú bằng ô bên trên.',
            'CONVERSATION_EMPTY_STATE' => 'Chưa có ghi chú nào. Dùng nút Thêm ghi chú để tạo.',
        ],
    ],
    'EMPTY_STATE' => [
        'TITLE' => 'Tài khoản này chưa có liên hệ nào',
        'SUBTITLE' => 'Bấm nút bên dưới để bắt đầu thêm liên hệ mới',
        'BUTTON_LABEL' => 'Thêm liên hệ',
        'SEARCH_EMPTY_STATE_TITLE' => 'Không có liên hệ nào khớp với tìm kiếm của bạn 🔍',
        'LIST_EMPTY_STATE_TITLE' => 'Không có liên hệ nào trong khung nhìn này 📋',
        'ACTIVE_EMPTY_STATE_TITLE' => 'Hiện chưa có liên hệ nào đang hoạt động 🌙',
    ],
    'LOAD_MORE' => 'Tải thêm',
];
